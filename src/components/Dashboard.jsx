import React, { useState } from 'react';
import { CATEGORIES } from './TransactionForm';
import { supabase } from '../lib/supabaseClient';
import { Coins, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';

export default function Dashboard({ transactions = [], budgets = [], userId, onBudgetUpdated }) {
  // Budget Form States
  const [budgetCategory, setBudgetCategory] = useState('Eating Out');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState('');
  const [budgetSuccess, setBudgetSuccess] = useState('');

  // Calculate current month MTD spent per category
  const getMonthSpending = (categoryName) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let sum = 0;
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.category === categoryName && tx.transaction_date) {
        const txDate = new Date(tx.transaction_date);
        if (!isNaN(txDate.getTime()) && txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
          sum += parseFloat(tx.amount || 0);
        }
      }
    });
    return sum;
  };

  // Upsert Category Budget config to Supabase
  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!userId || !budgetCategory || !budgetLimit) return;
    setBudgetLoading(true);
    setBudgetError('');
    setBudgetSuccess('');

    try {
      const limitVal = parseFloat(budgetLimit);
      if (isNaN(limitVal) || limitVal < 0) {
        throw new Error('Limit amount must be a positive number.');
      }

      const { error } = await supabase
        .from('budgets')
        .upsert({
          user_id: userId,
          category: budgetCategory,
          limit_amount: limitVal
        }, {
          onConflict: 'user_id,category'
        });

      if (error) throw error;

      setBudgetSuccess(`Budget limit updated for ${budgetCategory}!`);
      setBudgetLimit('');
      
      if (onBudgetUpdated) {
        onBudgetUpdated(); // refresh in App.jsx
      }
    } catch (err) {
      setBudgetError(err.message);
    } finally {
      setBudgetLoading(false);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/40 shadow-premium space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-slate-50 dark:border-slate-850">
        <Coins className="w-5 h-5 text-indigo-500" />
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Monthly Budgets</h2>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">Define and monitor category spending thresholds</p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Active Budgets List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Active Limits</h3>
          
          {budgets.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 italic py-8 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200/50 dark:border-slate-800/20">
              No active budget configurations. Add a category limit below.
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {budgets.map(b => {
                const spent = getMonthSpending(b.category);
                const limit = parseFloat(b.limit_amount || 0);
                const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                
                let barColor = 'bg-emerald-500';
                let textColor = 'text-emerald-600 dark:text-emerald-400';
                let badgeBg = 'bg-emerald-50 dark:bg-emerald-950/30';
                let label = 'Under Budget';

                if (pct >= 100) {
                  barColor = 'bg-rose-500';
                  textColor = 'text-rose-600 dark:text-rose-455';
                  badgeBg = 'bg-rose-50 dark:bg-rose-950/30';
                  label = '🔥 Over Budget';
                } else if (pct >= 85) {
                  barColor = 'bg-amber-500';
                  textColor = 'text-amber-650 dark:text-amber-400';
                  badgeBg = 'bg-amber-50 dark:bg-amber-950/30';
                  label = '⚠️ Near Limit';
                }

                return (
                  <div key={b.id} className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-850/50">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{b.category}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${badgeBg} ${textColor}`}>{label}</span>
                    </div>
                    
                    {/* Progress Indicator */}
                    <div className="w-full bg-slate-200 dark:bg-slate-950 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold">
                      <span>Spent: RM {spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span>Limit: RM {limit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Set Budget Form */}
        <div className="p-4 bg-slate-50/30 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-850/50 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-4 flex items-center gap-1">
            <span>Configure Budget Limit</span>
          </h3>

          {budgetError && (
            <div className="mb-3.5 p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/40 text-rose-600 dark:text-rose-455 rounded-xl text-[10px] flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{budgetError}</span>
            </div>
          )}
          {budgetSuccess && (
            <div className="mb-3.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] flex items-center gap-1.5 font-bold">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>{budgetSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSetBudget} className="space-y-4">
            <div>
              <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Category
              </label>
              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white font-bold"
              >
                {CATEGORIES.expense.filter(c => c.id !== 'Other Expense').map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Monthly Limit (RM)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white font-black"
              />
            </div>

            <button
              type="submit"
              disabled={budgetLoading}
              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {budgetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Budget</span>
            </button>
          </form>
        </div>

      </div>
    </section>
  );
}
export { CATEGORIES };
