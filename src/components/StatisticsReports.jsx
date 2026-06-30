import React, { useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import { CATEGORIES } from './TransactionForm';
import { getMerchantLogo } from '../utils/logoHelper';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from 'chart.js';
import { ChevronLeft, ChevronRight, PieChart, TrendingUp, Layers, ChevronDown, ChevronUp } from 'lucide-react';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

export default function StatisticsReports({ transactions = [] }) {
  const [timeframe, setTimeframe] = useState('month'); // week, month, year, all
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('both'); // 'both', 'groups' (can toggle chart cards)

  // 1. Move timeframe intervals
  const handlePrev = () => {
    if (timeframe === 'week') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
    } else if (timeframe === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (timeframe === 'year') {
      setCurrentDate(prev => new Date(prev.getFullYear() - 1, 0, 1));
    }
  };

  const handleNext = () => {
    if (timeframe === 'week') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
    } else if (timeframe === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (timeframe === 'year') {
      setCurrentDate(prev => new Date(prev.getFullYear() + 1, 0, 1));
    }
  };

  // Label text for navigation bar
  const getPeriodLabel = () => {
    if (timeframe === 'all') return 'All Time';
    if (timeframe === 'week') {
      // Start Sunday of week
      const sun = new Date(currentDate);
      sun.setDate(currentDate.getDate() - currentDate.getDay());
      const sat = new Date(sun);
      sat.setDate(sun.getDate() + 6);
      return `${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (timeframe === 'month') {
      return currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    if (timeframe === 'year') {
      return currentDate.getFullYear().toString();
    }
    return '';
  };

  // 2. Filter transactions to current timeframe (Expenses only for breakdown, but Trends can show cashflow)
  const filteredTransactions = transactions.filter(tx => {
    if (!tx.transaction_date) return false;
    const txDate = new Date(tx.transaction_date);

    if (timeframe === 'all') return true;

    if (timeframe === 'week') {
      const sun = new Date(currentDate);
      sun.setDate(currentDate.getDate() - currentDate.getDay());
      sun.setHours(0, 0, 0, 0);

      const sat = new Date(sun);
      sat.setDate(sun.getDate() + 6);
      sat.setHours(23, 59, 59, 999);

      return txDate >= sun && txDate <= sat;
    }

    if (timeframe === 'month') {
      return txDate.getFullYear() === currentDate.getFullYear() && txDate.getMonth() === currentDate.getMonth();
    }

    if (timeframe === 'year') {
      return txDate.getFullYear() === currentDate.getFullYear();
    }

    return false;
  });

  const expenseTransactions = filteredTransactions.filter(tx => tx.type === 'expense');
  const totalExpenseSum = expenseTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  // 3. Compile Category Distribution Breakdown
  const categoryMap = {};
  const categoryCountMap = {};
  expenseTransactions.forEach(tx => {
    categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    categoryCountMap[tx.category] = (categoryCountMap[tx.category] || 0) + 1;
  });

  const findCategoryConfig = (catId) => {
    return CATEGORIES.expense.find(c => c.id === catId) || { name: catId, emoji: '🏷️', color: '#CBD5E1' };
  };

  const chartLabels = [];
  const chartValues = [];
  const chartColors = [];
  const breakdownList = [];

  Object.entries(categoryMap).forEach(([catId, amount]) => {
    const details = findCategoryConfig(catId);
    const pct = totalExpenseSum > 0 ? Math.round((amount / totalExpenseSum) * 100) : 0;
    const txCount = categoryCountMap[catId] || 0;

    chartLabels.push(details.name);
    chartValues.push(amount);
    chartColors.push(details.color || '#CBD5E1');

    breakdownList.push({
      id: catId,
      name: details.name,
      emoji: details.emoji,
      color: details.color || '#CBD5E1',
      amount,
      pct,
      txCount
    });
  });

  breakdownList.sort((a, b) => b.amount - a.amount);

  // 4. Generate Line Chart Daily trend data
  const getLineChartData = () => {
    const dailyMap = {};
    
    if (timeframe === 'month') {
      // Days of the month
      const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= totalDays; i++) {
        dailyMap[i] = 0;
      }

      expenseTransactions.forEach(tx => {
        const day = new Date(tx.transaction_date).getDate();
        dailyMap[day] = (dailyMap[day] || 0) + tx.amount;
      });

      const labels = Object.keys(dailyMap).map(day => {
        if (day === '1' || day === '16' || day === String(totalDays)) {
          const monthLabel = currentDate.toLocaleString('en-US', { month: 'short' });
          return `${day} ${monthLabel}`;
        }
        return '';
      });

      const data = Object.values(dailyMap);

      return { labels, data };
    } else {
      // Fallback for weekly/yearly: just group chronologically
      const sortedTxs = [...expenseTransactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
      const labels = sortedTxs.map(tx => tx.transaction_date.split('-').slice(1).join('/'));
      const data = sortedTxs.map(tx => tx.amount);
      return { labels, data };
    }
  };

  const lineTrend = getLineChartData();

  // Dark mode trigger checks
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Chart configs
  const lineChartData = {
    labels: lineTrend.labels,
    datasets: [{
      label: 'Spending',
      data: lineTrend.data,
      borderColor: '#EF4444', // Red line from screenshots
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2.5,
      pointBackgroundColor: '#EF4444',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 1.5,
      pointRadius: 4,
      tension: 0.35,
      fill: true
    }]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: isDarkMode ? '#64748B' : '#94A3B8',
          font: { size: 9, weight: 'bold' }
        }
      },
      y: {
        grid: { color: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(226, 232, 240, 0.5)' },
        ticks: {
          color: isDarkMode ? '#64748B' : '#94A3B8',
          font: { size: 9 }
        }
      }
    }
  };

  const doughnutData = {
    labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
    datasets: [{
      data: chartValues.length > 0 ? chartValues : [1],
      backgroundColor: chartColors.length > 0 ? chartColors : [isDarkMode ? '#1E293B' : '#E2E8F0'],
      borderWidth: isDarkMode ? 3 : 2,
      borderColor: isDarkMode ? '#0F172A' : '#FFFFFF'
    }]
  };

  const doughnutOptions = {
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };

  // Feature B: Group Transactions by Merchant / Description for expanded category list
  const getSubcategoryBreakdown = (catId, parentAmount) => {
    const merchantMap = {};
    expenseTransactions
      .filter(tx => tx.category === catId)
      .forEach(tx => {
        const merchant = tx.description.trim() || 'Unknown';
        merchantMap[merchant] = (merchantMap[merchant] || 0) + tx.amount;
      });

    return Object.entries(merchantMap)
      .map(([merchant, amount]) => {
        const pct = parentAmount > 0 ? Math.round((amount / parentAmount) * 100) : 0;
        return { merchant, amount, pct };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto animate-scale-in">
      
      {/* Timeframe Switcher (Week, Month, Year, All) */}
      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 shadow-sm border border-slate-200/20 dark:border-slate-800/40">
        {['week', 'month', 'year', 'all'].map(t => (
          <button
            key={t}
            onClick={() => setTimeframe(t)}
            className={`flex-1 py-2 text-center text-xs font-bold capitalize transition-all rounded-xl ${timeframe === t ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Date Navigator */}
      {timeframe !== 'all' && (
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-sm">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-black text-slate-800 dark:text-slate-150 uppercase tracking-widest">
            {getPeriodLabel()}
          </span>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Card A: Transaction Trend line chart */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/40 shadow-premium relative">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 mb-4">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          Transaction Trend
        </h3>
        <div className="h-44 w-full relative">
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
      </div>

      {/* Expense Details header sum */}
      <div className="flex justify-between items-center px-1 pt-2">
        <h2 className="text-base font-black text-slate-850 dark:text-white tracking-tight">Expense Details</h2>
        <span className="text-base font-black text-slate-850 dark:text-white tracking-tight">
          RM {totalExpenseSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Card B: Doughnut Pie chart with floating Groups button */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/40 shadow-premium relative">
        <div className="relative w-full aspect-square max-w-[200px] mx-auto flex items-center justify-center">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Share Total</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {breakdownList.length} Categories
            </span>
          </div>
        </div>

        {/* Groups floating button */}
        <button 
          onClick={() => setViewMode(viewMode === 'groups' ? 'both' : 'groups')}
          className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 px-3.5 py-2 border border-slate-100 dark:border-slate-750 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl text-[10px] flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Groups</span>
        </button>
      </div>

      {/* Category Breakdown Drill-down list */}
      <div className="space-y-3 pb-8">
        {breakdownList.map(pt => {
          const isExpanded = expandedCategory === pt.id;
          const subBreakdown = isExpanded ? getSubcategoryBreakdown(pt.id, pt.amount) : [];
          
          return (
            <div key={pt.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 overflow-hidden shadow-sm transition-all">
              {/* Row header */}
              <div 
                onClick={() => setExpandedCategory(isExpanded ? null : pt.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-50/55 dark:bg-slate-950 flex items-center justify-center text-sm border border-slate-100 dark:border-slate-800 shrink-0">
                    {pt.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{pt.name}</h4>
                      <span className="text-[9px] text-slate-400 font-medium">({pt.pct}%)</span>
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5">
                      {pt.txCount} trans.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-205">
                      RM {parseFloat(pt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    {/* Visual Progress Line */}
                    <div className="w-16 bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: pt.color, width: `${pt.pct}%` }} />
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-450" /> : <ChevronDown className="w-4 h-4 text-slate-455" />}
                </div>
              </div>

              {/* Sub-items (Merchants) */}
              {isExpanded && (
                <div className="bg-slate-50/30 dark:bg-slate-950/20 px-4 py-2 border-t border-slate-50 dark:border-slate-850 divide-y divide-slate-100/50 dark:divide-slate-850/50 animate-slide-down">
                  {subBreakdown.length === 0 ? (
                    <div className="text-[10px] text-slate-400 italic py-2">No merchant records.</div>
                  ) : (
                    subBreakdown.map((sub, sidx) => (
                      <div key={sidx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {getMerchantLogo(sub.merchant)}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-350 truncate">{sub.merchant}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400 font-semibold">({sub.pct}%)</span>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            RM {parseFloat(sub.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
