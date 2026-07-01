import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { CATEGORIES } from './TransactionForm';
import FinanceInsights from './FinanceInsights';
import BillCalendar from './BillCalendar';

export default function HomeLedger({ userId, accounts = [], transactions = [], onTransactionDeleted }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getMonthYearString = () => {
    return currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filter transactions by current month and search terms
  const currentMonthTransactions = transactions.filter(tx => {
    if (!tx.transaction_date) return false;
    
    const txDateParts = tx.transaction_date.split('-');
    const txYear = parseInt(txDateParts[0], 10);
    const txMonth = parseInt(txDateParts[1], 10) - 1; // 0-11
    
    const isSameMonth = txYear === currentDate.getFullYear() && txMonth === currentDate.getMonth();
    if (!isSameMonth) return false;

    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      const descMatch = tx.description?.toLowerCase().includes(query);
      const catMatch = tx.category?.toLowerCase().includes(query);
      const amountMatch = tx.amount.toString().includes(query);
      return descMatch || catMatch || amountMatch;
    }

    return true;
  });

  // Calculate balance statistics
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

  // Group transactions by day
  const groupedTransactions = {};
  currentMonthTransactions.forEach(tx => {
    const dateStr = tx.transaction_date;
    if (!groupedTransactions[dateStr]) {
      const parsedDate = new Date(dateStr);
      const isValidDate = !isNaN(parsedDate.getTime());
      
      groupedTransactions[dateStr] = {
        dateString: dateStr,
        dayNum: isValidDate ? parsedDate.getDate() : '??',
        dayOfWeek: isValidDate ? parsedDate.toLocaleString('en-US', { weekday: 'long' }) : 'Unknown Day',
        monthStr: isValidDate ? parsedDate.toLocaleString('en-US', { month: 'short' }).toUpperCase() : '???',
        totalDailySpent: 0,
        items: []
      };
    }
    
    if (tx.type === 'expense') {
      groupedTransactions[dateStr].totalDailySpent -= parseFloat(tx.amount || 0);
    } else {
      groupedTransactions[dateStr].totalDailySpent += parseFloat(tx.amount || 0);
    }

    groupedTransactions[dateStr].items.push(tx);
  });

  const sortedGroups = Object.values(groupedTransactions).sort((a, b) => b.dateString.localeCompare(a.dateString));

  const formatCurrency = (val) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${isNegative ? '-' : ''} RM ${absVal}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '12:00 pm';
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
        onTransactionDeleted();
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-scale-in">
      
      {/* Month Navigator Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-sm transition-all duration-300">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
          {getMonthYearString()}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Grid: Responsive 3-Column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        
        {/* Left Side: Ledger List & Search filters (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          {/* Search Input Bar */}
          <div className="flex gap-2.5">
            <div className="flex-grow bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs w-full focus:outline-none dark:text-white"
              />
            </div>
            <button className="p-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-550 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-sm">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Grouped Transaction Listings */}
          <div className="space-y-6">
            {sortedGroups.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200/60 dark:border-slate-800 rounded-3xl text-slate-450 italic text-xs">
                No transaction ledger logs recorded for this period.
              </div>
            ) : (
              sortedGroups.map(group => (
                <div key={group.dateString} className="space-y-2.5">
                  
                  {/* Daily Date Header Row */}
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-700 dark:text-slate-300 font-extrabold border border-slate-200/20 dark:border-slate-800/20">
                        <span className="text-xs leading-none mt-0.5">{group.dayNum}</span>
                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-wider leading-none mt-0.5">{group.monthStr}</span>
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-205">{group.dayOfWeek}</span>
                    </div>
                    <span className={`text-xs font-extrabold ${group.totalDailySpent < 0 ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-600 dark:text-emerald-450'}`}>
                      {formatCurrency(group.totalDailySpent)}
                    </span>
                  </div>

                  {/* Daily Transactions cards */}
                  <div className="space-y-2.5">
                    {group.items.map(tx => (
                      <div 
                        key={tx.id} 
                        className="ledger-item bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/80 dark:border-slate-800/40 shadow-sm flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm border border-slate-100 dark:border-slate-800/50 shrink-0">
                            {getEmoji(tx.category)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{tx.category}</h4>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide mt-0.5 block truncate">
                              {tx.description || 'No Description'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`text-xs font-black block ${tx.type === 'expense' ? 'text-rose-600 dark:text-rose-405' : 'text-emerald-650 dark:text-emerald-400'}`}>
                              {tx.type === 'expense' ? '-' : '+'} RM {parseFloat(tx.amount).toFixed(2)}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
                              {formatTime(tx.created_at)}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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

        {/* Right Side: Sticky balance MTD cards (1 col on large screens) */}
        <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6 order-1 lg:order-2">
          {/* Balance card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/40 shadow-premium space-y-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block">BALANCE</span>
              <h2 className={`text-2xl font-black tracking-tight mt-1 ${currentBalance < 0 ? 'text-rose-650 dark:text-rose-400' : 'text-slate-850 dark:text-slate-100'}`}>
                {formatCurrency(currentBalance)}
              </h2>
            </div>

            {/* Income / Expense subpanels */}
            <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-50 dark:border-slate-850">
              {/* Income */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3.5 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 flex items-center gap-3">
                <span className="text-base">📈</span>
                <div>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider block">MTD INCOME</span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block mt-0.5">
                    RM {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Expense */}
              <div className="bg-rose-50/50 dark:bg-rose-950/10 p-3.5 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 flex items-center gap-3">
                <span className="text-base">📉</span>
                <div>
                  <span className="text-[9px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-wider block">MTD EXPENSE</span>
                  <span className="text-xs font-black text-rose-700 dark:text-rose-400 block mt-0.5">
                    RM {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Finance Insights */}
          <FinanceInsights transactions={transactions} />

          {/* Bill Calendar */}
          <BillCalendar userId={userId} accounts={accounts} />
        </div>     </div>

      </div>
    </div>
  );
}
