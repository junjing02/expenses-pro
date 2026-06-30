import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getMerchantLogo } from '../utils/logoHelper';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, AlertCircle, Trash2, Calendar } from 'lucide-react';
import { CATEGORIES } from './TransactionForm';

export default function HomeLedger({ userId, accounts = [], transactions = [], onTransactionDeleted }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Move month backward / forward
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Helper to format date header
  const getMonthYearString = () => {
    return currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  // 1. Filter transactions by current month and search terms
  const currentMonthTransactions = transactions.filter(tx => {
    if (!tx.transaction_date) return false;
    
    // Parse transaction date
    const txDateParts = tx.transaction_date.split('-');
    const txYear = parseInt(txDateParts[0], 10);
    const txMonth = parseInt(txDateParts[1], 10) - 1; // 0-11
    
    const isSameMonth = txYear === currentDate.getFullYear() && txMonth === currentDate.getMonth();
    if (!isSameMonth) return false;

    // Search filter
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      const descMatch = tx.description?.toLowerCase().includes(query);
      const catMatch = tx.category?.toLowerCase().includes(query);
      const amountMatch = tx.amount.toString().includes(query);
      return descMatch || catMatch || amountMatch;
    }

    return true;
  });

  // 2. Calculate balance statistics
  let totalIncome = 0;
  let totalExpense = 0;
  currentMonthTransactions.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += parseFloat(tx.amount || 0);
    } else {
      totalExpense += parseFloat(tx.amount || 0);
    }
  });

  const currentBalance = totalIncome - totalExpense;

  // 3. Group transactions by day
  const groupedTransactions = {};
  currentMonthTransactions.forEach(tx => {
    const dateStr = tx.transaction_date;
    if (!groupedTransactions[dateStr]) {
      groupedTransactions[dateStr] = {
        dateString: dateStr,
        dayNum: new Date(dateStr).getDate(),
        dayOfWeek: new Date(dateStr).toLocaleString('en-US', { weekday: 'long' }),
        monthStr: new Date(dateStr).toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        totalDailySpent: 0,
        items: []
      };
    }
    
    // Aggregate daily spent (Expenses reduce total, Income adds or is neutral? In screenshots, daily totals show negative sign for expenses: e.g. RM -8.00)
    if (tx.type === 'expense') {
      groupedTransactions[dateStr].totalDailySpent -= parseFloat(tx.amount || 0);
    } else {
      groupedTransactions[dateStr].totalDailySpent += parseFloat(tx.amount || 0);
    }

    groupedTransactions[dateStr].items.push(tx);
  });

  // Sort daily groups by date descending
  const sortedGroups = Object.values(groupedTransactions).sort((a, b) => b.dateString.localeCompare(a.dateString));

  // Helper to format currency
  const formatCurrency = (val) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${isNegative ? '-' : ''} RM ${absVal}`;
  };

  // Helper to format time
  const formatTime = (timeStr) => {
    if (!timeStr) return '12:00 pm';
    // Format created_at or default time
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return '12:00 pm';
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    } catch {
      return '12:00 pm';
    }
  };

  const getEmoji = (catName) => {
    const cat = CATEGORIES.expense.find(c => c.id === catName) || CATEGORIES.income.find(c => c.id === catName);
    return cat ? cat.emoji : '🏷️';
  };

  const handleDelete = async (txId) => {
    const confirmDelete = confirm('Are you sure you want to delete this transaction?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', txId);

      if (error) throw error;
      
      if (onTransactionDeleted) {
        onTransactionDeleted(); // refresh
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-scale-in">
      
      {/* Month Navigator Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-sm">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1 cursor-pointer">
          {getMonthYearString()}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="flex gap-2.5">
        <div className="flex-grow bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none dark:text-white"
          />
        </div>
        <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-slate-500 hover:bg-slate-50 transition-colors">
          <SlidersHorizontal className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Balance Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/40 shadow-premium space-y-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">BALANCE</span>
          <h2 className={`text-2xl font-black tracking-tight mt-1 ${currentBalance < 0 ? 'text-rose-600 dark:text-rose-450' : 'text-slate-850 dark:text-slate-100'}`}>
            {formatCurrency(currentBalance)}
          </h2>
        </div>

        {/* Row grids for Income / Expense sub-cards */}
        <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-slate-50 dark:border-slate-850">
          {/* Income Sub-card */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
              📈
            </div>
            <div>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider block">INCOME</span>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block mt-0.5">
                RM {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Expense Sub-card */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600">
              📉
            </div>
            <div>
              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-wider block">EXPENSE</span>
              <span className="text-xs font-black text-rose-700 dark:text-rose-400 block mt-0.5">
                RM {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List (Grouped by Day) */}
      <div className="space-y-6">
        {sortedGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-450 italic text-xs">
            No transactions found for this period.
          </div>
        ) : (
          sortedGroups.map(group => (
            <div key={group.dateString} className="space-y-2.5">
              {/* Daily Header */}
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-700 dark:text-slate-300 font-extrabold border border-slate-200/20 dark:border-slate-800/20">
                    <span className="text-xs leading-none mt-0.5">{group.dayNum}</span>
                    <span className="text-[7px] font-black uppercase text-slate-400 tracking-wider leading-none mt-0.5">{group.monthStr}</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-205">{group.dayOfWeek}</span>
                </div>
                <span className={`text-xs font-extrabold ${group.totalDailySpent < 0 ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-600'}`}>
                  {formatCurrency(group.totalDailySpent)}
                </span>
              </div>

              {/* Daily Transactions */}
              <div className="space-y-2.5">
                {group.items.map(tx => (
                  <div key={tx.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/80 dark:border-slate-800/50 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm border border-slate-100/55 dark:border-slate-850 shrink-0">
                        {getEmoji(tx.category)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150 truncate">{tx.category}</h4>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide mt-0.5 block truncate">
                          {tx.description || 'No Description'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-xs font-black block ${tx.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-450'}`}>
                          {tx.type === 'expense' ? '-' : '+'} RM {parseFloat(tx.amount).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
                          {formatTime(tx.created_at)}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
