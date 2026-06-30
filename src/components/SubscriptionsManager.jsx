import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getMerchantLogo, getWalletLogo } from '../utils/logoHelper';
import { ArrowLeft, RefreshCw, Plus, X, Trash2, Calendar, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SubscriptionsManager({ userId, accounts = [], onClose }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Subscription'); // Subscription, Loan, Recurring
  const [accountId, setAccountId] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);

  // Load subscriptions
  const fetchSubscriptions = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSubscriptions(data || []);
    } catch (err) {
      setError('Failed to load subscriptions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [userId, accounts]);

  // Add Subscription
  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!name || !amount || !accountId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        throw new Error('Amount must be a valid positive number.');
      }

      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          name: name.trim(),
          amount: numAmount,
          type,
          account_id: accountId,
          billing_cycle: billingCycle,
          next_payment_date: nextDate
        });

      if (insertError) throw insertError;

      setSuccess('Subscription added successfully!');
      setName('');
      setAmount('');
      setShowAddForm(false);
      fetchSubscriptions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete Subscription
  const handleDeleteSubscription = async (subId) => {
    const confirmDelete = confirm('Are you sure you want to delete this subscription?');
    if (!confirmDelete) return;

    try {
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subId);

      if (deleteError) throw deleteError;
      fetchSubscriptions();
    } catch (err) {
      setError('Failed to delete subscription: ' + err.message);
    }
  };

  // Calculate monthly totals
  const totalMonthly = subscriptions.reduce((sum, item) => {
    let amt = parseFloat(item.amount || 0);
    if (item.billing_cycle === 'weekly') {
      amt = amt * 4.33; // ~4.33 weeks per month
    } else if (item.billing_cycle === 'yearly') {
      amt = amt / 12;
    }
    return sum + amt;
  }, 0);

  const getAccountName = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    return acc ? acc.name : 'Unknown Account';
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 relative max-w-lg mx-auto border-x border-slate-100 dark:border-slate-850 animate-scale-in">
      
      {/* Header bar */}
      <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800/60 p-4 flex items-center justify-between z-30">
        <button onClick={onClose} className="p-1 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recurring & Subscriptions</h1>
        <button onClick={fetchSubscriptions} className="p-1 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="p-4 space-y-6">
        
        {/* Messages */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        {/* Total Cost Display Card */}
        <div className="bg-gradient-to-br from-indigo-550 to-violet-650 text-white rounded-3xl p-6 shadow-premium relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Calendar className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-indigo-150 uppercase">Total Recurring Expenses</span>
              <div className="text-3xl font-extrabold tracking-tight mt-1.5 flex items-baseline gap-1">
                <span>RM {totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-semibold text-indigo-200">/month</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold flex items-center gap-1">
              🗓️ {subscriptions.length} Active
            </span>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="space-y-3">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-450 italic text-xs">
              No active subscriptions or recurring payments found.
            </div>
          ) : (
            subscriptions.map(item => {
              const accountName = getAccountName(item.account_id);
              return (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {getMerchantLogo(item.name)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</span>
                        {item.type === 'Subscription' && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[8px] font-black tracking-wide uppercase">
                            SUB
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        {getWalletLogo(accountName)}
                        <span>{accountName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-205">
                      RM {parseFloat(item.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDeleteSubscription(item.id)}
                      className="p-1.5 text-slate-350 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB to Open Form Modal */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-650/25 transition-transform hover:scale-105 z-40 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Add Subscription Form Drawer/Modal Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 shadow-2xl border-t border-slate-100 dark:border-slate-800/80 animate-slide-up">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-850">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Add Recurring Payment</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Subscription / Expense Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spotify, House Loan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Amount (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                  >
                    <option value="Subscription">Subscription (SUB)</option>
                    <option value="Loan">House/Car Loan</option>
                    <option value="Recurring">Utility / Bill</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Next Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Charge Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Recurring Rule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
