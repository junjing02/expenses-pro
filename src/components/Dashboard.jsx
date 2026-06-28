import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { CATEGORIES } from './TransactionForm';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Coins, ArrowUpRight, ArrowDownLeft, Landmark, PieChart } from 'lucide-react';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard({ accounts, transactions }) {
  // 1. Calculate Net Worth
  const netWorth = accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);

  // 2. Calculate Cash Flow
  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  transactions.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeCount++;
    } else {
      totalExpenses += tx.amount;
      expenseCount++;
    }
  });

  // 3. Prep Category Breakdown Distribution (Expenses)
  const categoryMap = {};
  transactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    });

  const findCategoryConfig = (catId) => {
    let found = CATEGORIES.expense.find(c => c.id === catId);
    if (!found) {
      found = CATEGORIES.income.find(c => c.id === catId);
    }
    return found;
  };

  const getCategoryDetails = (catId) => {
    const config = findCategoryConfig(catId);
    return config ? { name: config.name, emoji: config.emoji, color: config.color || '#333' } : { name: catId, emoji: '🏷️', color: '#CBD5E1' };
  };

  // Compile datasets for Chart.js
  const chartLabels = [];
  const chartData = [];
  const chartColors = [];
  const breakdownList = [];

  Object.entries(categoryMap).forEach(([catId, amount]) => {
    const details = getCategoryDetails(catId);
    const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
    
    chartLabels.push(details.name);
    chartData.push(amount);
    chartColors.push(details.color);

    breakdownList.push({
      id: catId,
      name: details.name,
      emoji: details.emoji,
      color: details.color,
      amount,
      pct
    });
  });

  // Sort list by highest expenses
  breakdownList.sort((a, b) => b.amount - a.amount);

  // Check if dark mode is active
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Chart Data Configuration
  const defaultChartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['No Expenses Recorded'],
    datasets: [{
      data: chartData.length > 0 ? chartData : [1],
      backgroundColor: chartColors.length > 0 ? chartColors : [isDarkMode ? '#1E293B' : '#E2E8F0'],
      borderWidth: isDarkMode ? 3 : 2,
      borderColor: isDarkMode ? '#0F172A' : '#FFFFFF',
      hoverOffset: chartData.length > 0 ? 6 : 0
    }]
  };

  const chartOptions = {
    cutout: '75%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: chartData.length > 0,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
            const percentage = ((value / total) * 100).toFixed(0);
            return ` ${label}: $${value.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-slide-in">
      {/* 3-Card Dashboard Scoreboard */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Net Worth Card */}
        <div className="md:col-span-3 lg:col-span-1 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 dark:from-slate-900 dark:to-slate-900 text-white p-6 shadow-premium relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-slate-800/10 pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <Coins className="w-40 h-40" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-indigo-300" /> Current Net Balance
            </h2>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-450 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span> Total accumulated wealth
            </p>
          </div>
        </div>

        {/* Total Income Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-premium border border-slate-100 dark:border-slate-800/40 relative overflow-hidden group flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Income</h3>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-550 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-3">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{incomeCount}</span> incoming deposits
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-premium border border-slate-100 dark:border-slate-800/40 relative overflow-hidden group flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Expenses</h3>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-550 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/50 pt-3">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{expenseCount}</span> outgoing charges
          </div>
        </div>
      </section>

      {/* Analytics Category Breakdown Graph */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-500" />
              Analytics Breakdown
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Visual distribution of expenses</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Doughnut Canvas wrapper */}
          <div className="relative w-full aspect-square max-w-[240px] mx-auto flex items-center justify-center">
            <Doughnut data={defaultChartData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Spent</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Interactive Legends */}
          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Categories List</h3>
            {breakdownList.length === 0 ? (
              <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
                No expense entries to calculate distribution profiles.
              </div>
            ) : (
              breakdownList.map(pt => (
                <div 
                  key={pt.id} 
                  className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pt.color }}></span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {pt.emoji} {pt.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-slate-405">{pt.pct}%</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      ${pt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
export { CATEGORIES };
