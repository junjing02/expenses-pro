import React, { useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { CATEGORIES } from './TransactionForm';
import { supabase } from '../lib/supabaseClient';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js';
import { Coins, ArrowUpRight, ArrowDownLeft, Landmark, PieChart, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default function Dashboard({ accounts, transactions, budgets = [], userId, onBudgetUpdated }) {
  const [timeframe, setTimeframe] = useState('monthly'); // 'monthly' or 'weekly'
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  // Budget Form States
  const [budgetCategory, setBudgetCategory] = useState('Eating Out');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState('');
  const [budgetSuccess, setBudgetSuccess] = useState('');

  // 1. Calculate Net Worth
  const netWorth = accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);

  // 2. Calculate Cash Flow
  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  transactions.forEach(tx => {
    const amt = parseFloat(tx.amount || 0);
    if (tx.type === 'income') {
      totalIncome += amt;
      incomeCount++;
    } else {
      totalExpenses += amt;
      expenseCount++;
    }
  });

  // 3. Prep Category Breakdown Distribution (Expenses)
  const categoryMap = {};
  transactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const amt = parseFloat(tx.amount || 0);
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amt;
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

  // Helper function to generate last 6 months or weeks labels and calculate sum values
  const getTrendData = () => {
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    const now = new Date();

    if (timeframe === 'monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('en-US', { month: 'short' });
        const yearLabel = d.getFullYear();
        labels.push(`${monthLabel} ${yearLabel}`);

        // Filter transactions in this month/year
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        let incSum = 0;
        let expSum = 0;

        transactions.forEach(tx => {
          if (tx.transaction_date) {
            const txDateParts = tx.transaction_date.split('-');
            const txKey = `${txDateParts[0]}-${txDateParts[1]}`;
            if (txKey === key) {
              if (tx.type === 'income') incSum += parseFloat(tx.amount || 0);
              else expSum += parseFloat(tx.amount || 0);
            }
          }
        });

        incomeData.push(incSum);
        expenseData.push(expSum);
      }
    } else {
      // Last 6 weeks (based on starting Sunday date)
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - now.getDay() - (i * 7)); // Starting Sunday of the week i weeks ago
        const weekLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(`Wk of ${weekLabel}`);

        // Set start and end range for this week (Sunday to Saturday)
        const startRange = new Date(d);
        startRange.setHours(0, 0, 0, 0);
        
        const endRange = new Date(d);
        endRange.setDate(d.getDate() + 6);
        endRange.setHours(23, 59, 59, 999);

        let incSum = 0;
        let expSum = 0;

        transactions.forEach(tx => {
          if (tx.transaction_date) {
            const txDateParts = tx.transaction_date.split('-');
            const txDate = new Date(txDateParts[0], txDateParts[1] - 1, txDateParts[2]);
            if (txDate >= startRange && txDate <= endRange) {
              if (tx.type === 'income') incSum += parseFloat(tx.amount || 0);
              else expSum += parseFloat(tx.amount || 0);
            }
          }
        });

        incomeData.push(incSum);
        expenseData.push(expSum);
      }
    }

    return { labels, incomeData, expenseData };
  };

  const trend = getTrendData();

  const trendChartData = {
    labels: trend.labels,
    datasets: [
      {
        label: 'Income',
        data: trend.incomeData,
        backgroundColor: 'rgba(52, 211, 153, 0.85)', // Emerald 400
        borderRadius: 6,
      },
      {
        label: 'Expenses',
        data: trend.expenseData,
        backgroundColor: 'rgba(244, 114, 182, 0.85)', // Pink 400
        borderRadius: 6,
      }
    ]
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: isDarkMode ? '#94A3B8' : '#475569',
          boxWidth: 12,
          font: { size: 10, weight: 'bold' }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return ` ${context.dataset.label}: $${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: isDarkMode ? '#64748B' : '#94A3B8',
          font: { size: 9, weight: 'bold' }
        }
      },
      y: {
        grid: {
          color: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.6)'
        },
        ticks: {
          color: isDarkMode ? '#64748B' : '#94A3B8',
          font: { size: 9 },
          callback: function(value) {
            return '$' + value;
          }
        }
      }
    }
  };

  // Chart Data Configuration (Doughnut)
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

  // Feature B: Group Transactions by Merchant / Description for Drill-down reports
  const getSubcategoryBreakdown = (catId, parentAmount) => {
    const merchantMap = {};
    transactions
      .filter(tx => tx.type === 'expense' && tx.category === catId)
      .forEach(tx => {
        const merchant = tx.description.trim() || 'Unknown Merchant';
        merchantMap[merchant] = (merchantMap[merchant] || 0) + tx.amount;
      });

    return Object.entries(merchantMap)
      .map(([merchant, amount]) => {
        const pct = parentAmount > 0 ? Math.round((amount / parentAmount) * 100) : 0;
        return { merchant, amount, pct };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  // Feature C: Calculate current month MTD spent per category
  const getMonthSpending = (categoryName) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let sum = 0;
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.category === categoryName && tx.transaction_date) {
        const txDate = new Date(tx.transaction_date);
        if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
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

      {/* Analytics Category Breakdown Graph (Drill-Down Enabled) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-500" />
              Analytics Breakdown
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">Tap a category below to drill-down into specific merchant spending</p>
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

          {/* Interactive Drill-down Legends */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-2">Categories List</h3>
            {breakdownList.length === 0 ? (
              <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
                No expense entries to calculate distribution profiles.
              </div>
            ) : (
              breakdownList.map(pt => {
                const isExpanded = expandedCategory === pt.id;
                const subBreakdown = isExpanded ? getSubcategoryBreakdown(pt.id, pt.amount) : [];

                return (
                  <div key={pt.id} className="space-y-1">
                    <div 
                      onClick={() => setExpandedCategory(isExpanded ? null : pt.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${isExpanded ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pt.color }}></span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350 truncate">
                          {pt.emoji} {pt.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400">{pt.pct}%</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                          ${pt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Drill-down list */}
                    {isExpanded && (
                      <div className="pl-6 pr-2 py-1.5 space-y-2 border-l border-dashed border-indigo-200 dark:border-indigo-950/50 ml-3.5 animate-scale-in">
                        {subBreakdown.length === 0 ? (
                          <div className="text-[9px] text-slate-400 italic py-1">No merchant entries.</div>
                        ) : (
                          subBreakdown.map((sub, sidx) => (
                            <div key={sidx} className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-600 dark:text-slate-450 font-medium">{sub.merchant}</span>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-slate-400 text-[9px] font-medium">({sub.pct}%)</span>
                                <span className="text-slate-750 dark:text-slate-300">
                                  ${sub.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Cash Flow Trends Widget */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Cash Flow Trends
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-505 mt-0.5">Compare monthly or weekly cash flows</p>
          </div>

          {/* Timeframe selector toggle */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeframe === 'weekly' ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/10' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Weekly Trend
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeframe === 'monthly' ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/10' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Monthly Trend
            </button>
          </div>
        </div>

        {/* Trend Bar Chart wrapper */}
        <div className="h-64 w-full relative">
          <Bar data={trendChartData} options={trendChartOptions} />
        </div>
      </section>

      {/* Feature C: Monthly Budget Settings & Tracking */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-500" />
              Monthly Budgets Configuration & Tracking
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Define and monitor category budget thresholds</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Active Budgets list */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-3">Budget Progress</h3>
            
            {budgets.length === 0 ? (
              <div className="text-xs text-slate-450 dark:text-slate-550 italic py-8 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-250/60 dark:border-slate-800/40">
                No active budget configurations. Setup a category limit on the right.
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                {budgets.map(b => {
                  const spent = getMonthSpending(b.category);
                  const limit = b.limit_amount;
                  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                  
                  // Progress color thresholds
                  let barColor = 'bg-emerald-500';
                  let textColor = 'text-emerald-600 dark:text-emerald-400';
                  let label = 'Under Budget';

                  if (pct >= 100) {
                    barColor = 'bg-rose-500';
                    textColor = 'text-rose-600 dark:text-rose-400';
                    label = '🔥 Over Budget';
                  } else if (pct >= 80) {
                    barColor = 'bg-amber-500';
                    textColor = 'text-amber-650 dark:text-amber-400';
                    label = '⚠️ Near Limit';
                  }

                  return (
                    <div key={b.id} className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-100/60 dark:border-slate-850/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{b.category}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${textColor}`}>{label}</span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="w-full bg-slate-200/50 dark:bg-slate-950 rounded-full h-2 mb-2 overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Spent: ${spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        <span>Limit: ${limit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Set/Edit Budget Form */}
          <div className="p-5 bg-slate-50/30 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-850/50 rounded-2xl flex flex-col justify-start">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-4">
              Configure Limit
            </h3>

            {budgetError && (
              <div className="mb-3.5 p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/40 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{budgetError}</span>
              </div>
            )}
            {budgetSuccess && (
              <div className="mb-3.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] flex items-center gap-1.5 font-medium">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>{budgetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSetBudget} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Category
                </label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                >
                  {CATEGORIES.expense.filter(c => c.id !== 'Other Expense').map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Monthly Limit (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={budgetLoading}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
              >
                {budgetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Budget
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
export { CATEGORIES };
