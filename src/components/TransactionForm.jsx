import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PlusCircle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const CATEGORIES = {
  expense: [
    { id: 'food', name: 'Food & Dining', emoji: '🍔' },
    { id: 'transport', name: 'Transport & Fuel', emoji: '🚗' },
    { id: 'rent', name: 'Rent & Housing', emoji: '🏠' },
    { id: 'shopping', name: 'Shopping & Styling', emoji: '🛍️' },
    { id: 'entertainment', name: 'Leisure & Fun', emoji: '🍿' },
    { id: 'health', name: 'Health & Medical', emoji: '🏥' },
    { id: 'education', name: 'Education', emoji: '🎓' },
    { id: 'travel', name: 'Travel & Vacation', emoji: '✈️' },
    { id: 'utilities', name: 'Utilities & Bills', emoji: '🔌' },
    { id: 'other_expense', name: 'Other Expense', emoji: '🏷️' }
  ],
  income: [
    { id: 'salary', name: 'Salary & Wages', emoji: '💰' },
    { id: 'investments', name: 'Investments', emoji: '📈' },
    { id: 'freelance', name: 'Freelance Hustle', emoji: '💼' },
    { id: 'gifts', name: 'Gifts & Awards', emoji: '🎁' },
    { id: 'other_income', name: 'Other Income', emoji: '🔄' }
  ]
};

export default function TransactionForm({ userId, accounts, onTransactionSaved, onClose }) {
  const [type, setType] = useState('expense'); // 'expense' or 'income'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Default dropdown selections
  React.useEffect(() => {
    if (accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  React.useEffect(() => {
    // Default category based on type
    setCategory(CATEGORIES[type][0].id);
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !accountId || !amount || !description) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Amount must be greater than zero.');
      }

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          account_id: accountId,
          type,
          amount: amountValue,
          category,
          description: description.trim(),
          transaction_date: date
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess('Transaction saved!');
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);

      if (onTransactionSaved) {
        onTransactionSaved();
      }
      
      if (onClose) {
        setTimeout(onClose, 800); // Auto-close modal after brief delay
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
        <PlusCircle className="w-5 h-5 text-indigo-500" />
        Record Transaction
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type Slider */}
        <div className="relative p-1 bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-between border border-slate-200/30 dark:border-slate-800/30 cursor-pointer">
          <div 
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200/10 dark:border-slate-800/50 transition-all duration-300"
            style={{ transform: type === 'expense' ? 'translateX(0)' : 'translateX(100%)' }}
          />
          <button 
            type="button" 
            onClick={() => setType('expense')}
            className={`relative z-10 w-1/2 py-2 text-xs font-bold text-center select-none transition-colors ${type === 'expense' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}
          >
            Expense
          </button>
          <button 
            type="button" 
            onClick={() => setType('income')}
            className={`relative z-10 w-1/2 py-2 text-xs font-bold text-center select-none transition-colors ${type === 'income' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}
          >
            Income
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">$</span>
            <input 
              type="number" 
              step="0.01" 
              min="0.01" 
              required 
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
            />
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
            Merchant / Description
          </label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Target, Starbucks, Paycheck..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Account selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white appearance-none"
            >
              {accounts.length === 0 ? (
                <option value="">No Accounts Available</option>
              ) : (
                accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (${acc.current_balance})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white appearance-none"
            >
              {CATEGORIES[type].map(c => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
            Transaction Date
          </label>
          <input 
            type="date" 
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={loading || accounts.length === 0}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6 text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : null}
          Record Transaction
        </button>
      </form>
    </div>
  );
}
export { CATEGORIES };
