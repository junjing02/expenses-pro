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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

export default function StatisticsReports({ transactions = [] }) {
  const [timeframe, setTimeframe] = useState('month'); // week, month, year, all
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedCategory, setExpandedCategory] = useState(null);

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

  const getPeriodLabel = () => {
    if (timeframe === 'all') return 'All Time';
    if (timeframe === 'week') {
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

  const getLineChartData = () => {
    const dailyMap = {};
    
    if (timeframe === 'month') {
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
      const sortedTxs = [...expenseTransactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
      const labels = sortedTxs.map(tx => tx.transaction_date.split('-').slice(1).join('/'));
      const data = sortedTxs.map(tx => tx.amount);
      return { labels, data };
    }
  };

  const lineTrend = getLineChartData();
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const lineChartData = {
    labels: lineTrend.labels,
    datasets: [{
      label: 'Spending',
      data: lineTrend.data,
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
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
    <div className="space-y-6 pb-20 animate-scale-in">
      
      {/* Timeframe Switcher */}
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

      {/* Main Grid: Responsive 2 Columns Layout for line graphs & tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Transaction Trend */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/40 shadow-premium relative">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 mb-4">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Transaction Trend
            </h3>
            <div className="h-56 w-full relative">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>
        </div>

        {/* Right Column: Expense Details Chart & List */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-base font-black text-slate-850 dark:text-white tracking-tight">Expense Details</h2>
            <span className="text-base font-black text-slate-850 dark:text-white tracking-tight">
              RM {totalExpenseSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/40 shadow-premium relative">
            <div className="relative w-full aspect-square max-w-[180px] mx-auto flex items-center justify-center">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Share Total</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {breakdownList.length} Categories
                </span>
              </div>
            </div>
          </div>

          {/* Drill-down list */}
          <div className="space-y-3">
            {breakdownList.map(pt => {
              const isExpanded = expandedCategory === pt.id;
              const subBreakdown = isExpanded ? getSubcategoryBreakdown(pt.id, pt.amount) : [];
              
              return (
                <div key={pt.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100/60 dark:border-slate-800/50 overflow-hidden shadow-sm transition-all">
                  <div 
                    onClick={() => setExpandedCategory(isExpanded ? null : pt.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-55 dark:bg-slate-950 flex items-center justify-center text-sm border border-slate-100 dark:border-slate-800 shrink-0">
                        {pt.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
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
                        <div className="w-16 bg-slate-100 dark:bg-slate-950 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ backgroundColor: pt.color, width: `${pt.pct}%` }} />
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-450" /> : <ChevronDown className="w-4 h-4 text-slate-455" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50/30 dark:bg-slate-950/25 px-4 py-2 border-t border-slate-50 dark:border-slate-850 divide-y divide-slate-100/50 dark:divide-slate-850/50 animate-slide-down">
                      {subBreakdown.length === 0 ? (
                        <div className="text-[10px] text-slate-400 italic py-2">No merchant records.</div>
                      ) : (
                        subBreakdown.map((sub, sidx) => (
                          <div key={sidx} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              {getMerchantLogo(sub.merchant)}
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-350 truncate">{sub.merchant}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-semibold">({sub.pct}%)</span>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
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

      </div>
    </div>
  );
}
