import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Landmark, Plus, X, Wallet, ShieldAlert, Loader2 } from 'lucide-react';

export default function AccountCard({ userId, accounts, onAccountAdded }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Checking');
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !name) return;
    setLoading(true);
    setError('');

    try {
      const balanceValue = parseFloat(initialBalance) || 0.00;
      const { data, error: insertError } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: name.trim(),
          type,
          current_balance: balanceValue
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Close modal/form and trigger refresh
      setName('');
      setType('Checking');
      setInitialBalance('');
      setShowAddForm(false);
      
      if (onAccountAdded) {
        onAccountAdded();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (accType) => {
    switch (accType) {
      case 'Checking': return '💳';
      case 'Savings': return '🏦';
      case 'Credit Card': return '🪪';
      case 'Investment': return '📈';
      case 'Cash': return '💵';
      default: return '🪙';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-5">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-indigo-500" />
          My Accounts
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-colors"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Create Account Inline Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/40 animate-scale-in">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Account Name
            </label>
            <input
              type="text"
              placeholder="e.g. Chase Checking, Vanguard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Investment">Investment</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Opening Balance
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Account
          </button>
        </form>
      )}

      {/* Account Items List */}
      <div className="space-y-3.5">
        {accounts.length === 0 ? (
          <div className="text-center py-6">
            <Wallet className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-400 dark:text-slate-500">No accounts configured yet.</p>
          </div>
        ) : (
          accounts.map((acc) => (
            <div 
              key={acc.id} 
              className="flex justify-between items-center p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-950/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg bg-white dark:bg-slate-900 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm">
                  {getAccountIcon(acc.type)}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{acc.name}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">{acc.type}</span>
                </div>
              </div>
              <span className={`text-xs font-extrabold ${acc.current_balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                ${acc.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
