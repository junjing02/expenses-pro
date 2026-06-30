import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getWalletLogo } from '../utils/logoHelper';
import { Plus, X, Landmark, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function WalletList({ userId, accounts = [], onAccountAdded }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Checking'); // Checking, Credit Card, E-Wallet, Cash
  const [balance, setBalance] = useState('');
  const [limit, setLimit] = useState('');

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!userId || !name || !balance) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const numBalance = parseFloat(balance);
      const numLimit = type === 'Credit Card' ? parseFloat(limit) : null;

      if (isNaN(numBalance)) {
        throw new Error('Initial balance must be a valid number.');
      }

      const { error: insertError } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: name.trim(),
          type,
          current_balance: numBalance,
          credit_limit: numLimit
        });

      if (insertError) throw insertError;

      setSuccess('Wallet added successfully!');
      setName('');
      setBalance('');
      setLimit('');
      setShowAddModal(false);

      if (onAccountAdded) {
        onAccountAdded();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);

  const banksAndCards = accounts.filter(acc => acc.type === 'Checking' || acc.type === 'Credit Card');
  const eWallets = accounts.filter(acc => acc.type === 'E-Wallet');
  const cashWallets = accounts.filter(acc => acc.type === 'Cash');

  return (
    <div className="space-y-6 pb-20 animate-scale-in">
      
      {/* Header Area */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Wallets</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-9 h-9 rounded-full bg-indigo-650 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-455 text-xs flex items-center gap-2">
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

      {/* Total Balance Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/40 shadow-premium">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block">Total Balance</span>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-105 tracking-tight mt-1.5">
          RM {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </h2>
      </div>

      {/* Group Lists Grid (Responsive 3 columns side-by-side on desktop!) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Banks & Credit Cards */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
            BANKS & CREDIT CARDS
          </h3>
          
          {banksAndCards.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic pl-1 py-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200/50 dark:border-slate-850/50 text-center">
              No accounts.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 overflow-hidden divide-y divide-slate-50 dark:divide-slate-850 shadow-sm">
              {banksAndCards.map(acc => (
                <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                  <div className="flex items-center gap-3">
                    {getWalletLogo(acc.name)}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{acc.name}</h4>
                      <span className="text-[9px] text-slate-400 dark:text-slate-550 capitalize mt-0.5 block">
                        {acc.type === 'Checking' ? 'Bank' : 'Credit'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-850 dark:text-slate-205 block">
                      RM {parseFloat(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    {acc.type === 'Credit Card' && acc.credit_limit && (
                      <span className="text-[9px] text-slate-450 block mt-0.5 font-medium">
                        Limit: RM {parseFloat(acc.credit_limit).toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: E-Wallets */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
            E-WALLETS
          </h3>
          
          {eWallets.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic pl-1 py-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200/50 dark:border-slate-850/50 text-center">
              No e-wallets.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 overflow-hidden divide-y divide-slate-50 dark:divide-slate-850 shadow-sm">
              {eWallets.map(acc => (
                <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                  <div className="flex items-center gap-3">
                    {getWalletLogo(acc.name)}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{acc.name}</h4>
                      <span className="text-[9px] text-slate-400 dark:text-slate-550 capitalize mt-0.5 block">E-Wallet</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-850 dark:text-slate-205 block">
                      RM {parseFloat(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Cash */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
            CASH
          </h3>
          
          {cashWallets.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic pl-1 py-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200/50 dark:border-slate-850/50 text-center">
              No cash wallets.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 overflow-hidden divide-y divide-slate-50 dark:divide-slate-850 shadow-sm">
              {cashWallets.map(acc => (
                <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                  <div className="flex items-center gap-3">
                    {getWalletLogo(acc.name)}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{acc.name}</h4>
                      <span className="text-[9px] text-slate-400 dark:text-slate-550 capitalize mt-0.5 block">Cash</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-850 dark:text-slate-205 block">
                      RM {parseFloat(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add Account Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-50 dark:border-slate-850">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Add Account/Wallet</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850">
                <X className="w-4.5 h-4.5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Wallet / Bank Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maybank, TnG eWallet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Wallet Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                  >
                    <option value="Checking">Checking Account</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Cash">Cash Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Initial Balance (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white font-semibold"
                  />
                </div>
              </div>

              {type === 'Credit Card' && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Credit Limit (RM)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create Wallet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
