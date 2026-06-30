import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Award, AlertTriangle, Coins } from 'lucide-react';

export default function FinanceInsights({ transactions = [] }) {
  // 1. Process current month transactions
  const now = new Date();
  const currentMonthTransactions = transactions.filter(tx => {
    if (!tx.transaction_date) return false;
    const txDate = new Date(tx.transaction_date);
    return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
  });

  const totalIncome = currentMonthTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  const totalExpense = currentMonthTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  // 2. Calculations
  // A. Daily Burn Rate
  const totalDays = now.getDate(); // Days elapsed so far this month
  const dailyBurnRate = totalDays > 0 ? (totalExpense / totalDays) : 0;

  // B. Savings Rate
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // C. Top Expense Category
  const categoryMap = {};
  currentMonthTransactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    });

  let topCategory = 'None';
  let topCatAmount = 0;
  Object.entries(categoryMap).forEach(([cat, amount]) => {
    if (amount > topCatAmount) {
      topCategory = cat;
      topCatAmount = amount;
    }
  });

  const topCategoryPct = totalExpense > 0 ? Math.round((topCatAmount / totalExpense) * 100) : 0;

  // D. Highest Single Outflow
  let highestTx = null;
  currentMonthTransactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      if (!highestTx || tx.amount > highestTx.amount) {
        highestTx = tx;
      }
    });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/40 shadow-premium space-y-6">
      
      {/* Title */}
      <div className="flex items-center gap-2 pb-4 border-b border-slate-50 dark:border-slate-850">
        <Lightbulb className="w-5 h-5 text-yellow-500 fill-yellow-500/10" />
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Monthly Insights</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Automated analytics parsed from your statements</p>
        </div>
      </div>

      {/* Grid of Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Insight 1: Savings Rate */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-850/50 flex gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-750 dark:text-slate-205">Monthly Savings Rate</h4>
            <div className="text-base font-black text-slate-850 dark:text-white mt-1">
              {savingsRate > 0 ? `${savingsRate}%` : '0%'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              {savingsRate >= 30 ? (
                'Excellent! You are saving more than 30% of your income. Keep building your wealth.'
              ) : savingsRate > 0 ? (
                'Good job. Try to allocate 20% of your deposits directly into savings goals.'
              ) : (
                'You spent more than you earned this month. Review your category limits.'
              )}
            </p>
          </div>
        </div>

        {/* Insight 2: Daily Burn Rate */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-850/50 flex gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-750 dark:text-slate-205">Daily Burn Rate</h4>
            <div className="text-base font-black text-slate-850 dark:text-white mt-1">
              RM {dailyBurnRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              At this pace, your total expenditure will reach about RM {(dailyBurnRate * 30).toFixed(0)} by the end of the month.
            </p>
          </div>
        </div>

        {/* Insight 3: Top Category Outflow */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-850/50 flex gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center shrink-0">
            <Coins className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-750 dark:text-slate-205">Major Outflow Category</h4>
            <div className="text-base font-black text-slate-850 dark:text-white mt-1">
              {topCategory} ({topCategoryPct}%)
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              You have spent RM {topCatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} on {topCategory} out of RM {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })} total outflows.
            </p>
          </div>
        </div>

        {/* Insight 4: Peak Purchase */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-850/50 flex gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-750 dark:text-slate-205">Peak Purchase</h4>
            <div className="text-base font-black text-slate-850 dark:text-white mt-1">
              {highestTx ? `RM ${parseFloat(highestTx.amount).toFixed(2)}` : 'None'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              {highestTx ? (
                `Your highest single outflow transaction was spent on "${highestTx.category}" (${highestTx.description || 'No Merchant info'}).`
              ) : (
                'No transaction records registered this month.'
              )}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
