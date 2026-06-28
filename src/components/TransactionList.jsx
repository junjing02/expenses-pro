import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CATEGORIES } from './TransactionForm';
import { Search, Tags, ArrowUpDown, Trash, AlertCircle, FileImage, ExternalLink, X } from 'lucide-react';

export default function TransactionList({ userId, transactions, onTransactionDeleted }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [error, setError] = useState('');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState(null);

  // Apply filters and sorting locally
  useEffect(() => {
    let result = [...transactions];

    // Filter by type (income/expense)
    if (typeFilter !== 'all') {
      result = result.filter(tx => tx.type === typeFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(tx => tx.category === categoryFilter);
    }

    // Search filter (description / category)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(tx => {
        const catConfig = findCategoryConfig(tx.category);
        const catName = catConfig ? catConfig.name : tx.category;
        return tx.description.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
      });
    }

    // Sort operations
    if (sortBy === 'date-desc') {
      result.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
    } else if (sortBy === 'date-asc') {
      result.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
    } else if (sortBy === 'amount-desc') {
      result.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'amount-asc') {
      result.sort((a, b) => a.amount - b.amount);
    }

    setFilteredTransactions(result);
  }, [transactions, search, typeFilter, categoryFilter, sortBy]);

  const findCategoryConfig = (catId) => {
    let found = CATEGORIES.expense.find(c => c.id === catId);
    if (!found) {
      found = CATEGORIES.income.find(c => c.id === catId);
    }
    return found;
  };

  const getCategoryDetails = (catId) => {
    const config = findCategoryConfig(catId);
    return config ? { name: config.name, emoji: config.emoji } : { name: catId, emoji: '🏷️' };
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      if (onTransactionDeleted) {
        onTransactionDeleted();
      }
    } catch (err) {
      setError(`Failed to delete: ${err.message}`);
    }
  };

  // Generate a signed URL on-the-fly to view private storage receipts
  const handleViewReceipt = async (filePath) => {
    try {
      const { data, error: signedError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(filePath, 300); // 5 minutes expiration

      if (signedError) throw signedError;
      setSelectedReceiptUrl(data.signedUrl);
    } catch (err) {
      alert(`Could not retrieve receipt image: ${err.message}`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/60 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">History Ledger</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manage and review your transactions</p>
        </div>

        {/* Type Toggles */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl max-w-max self-start sm:self-center border border-slate-200/30 dark:border-slate-800/30">
          <button 
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${typeFilter === 'all' ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            All
          </button>
          <button 
            onClick={() => setTypeFilter('income')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${typeFilter === 'income' ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Income
          </button>
          <button 
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${typeFilter === 'expense' ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Expenses
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and sorting UI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Search merchant/tag..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
          />
        </div>

        {/* Category selector */}
        <div className="relative">
          <Tags className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white appearance-none"
          >
            <option value="all">All Categories</option>
            <optgroup label="Expense Categories">
              {CATEGORIES.expense.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </optgroup>
            <optgroup label="Income Categories">
              {CATEGORIES.income.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </optgroup>
          </select>
        </div>

        {/* Sort Selector */}
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white appearance-none"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Amount: High to Low</option>
            <option value="amount-asc">Amount: Low to High</option>
          </select>
        </div>
      </div>

      {/* Ledger Container */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[480px] overflow-y-auto pr-1 no-scrollbar min-h-[150px]">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs">
            No transaction records found matching active filters.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isInc = tx.type === 'income';
            const cat = getCategoryDetails(tx.category);
            return (
              <div 
                key={tx.id} 
                className="ledger-item py-3.5 flex items-center justify-between group border-b border-slate-100/60 dark:border-slate-800/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-lg shadow-sm">
                    {cat.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] mt-0.5 font-semibold">
                      <span>{cat.name}</span>
                      <span>•</span>
                      <span>{new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {tx.accounts && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-500 dark:text-indigo-400">{tx.accounts.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Receipt trigger */}
                  {tx.receipt_image_url && (
                    <button
                      onClick={() => handleViewReceipt(tx.receipt_image_url)}
                      className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      title="View Extracted Receipt"
                    >
                      <FileImage className="w-4 h-4" />
                    </button>
                  )}

                  <span className={`text-xs font-black ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isInc ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>

                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-all"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Receipt Image Popup Modal */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 modal-backdrop-blur" onClick={() => setSelectedReceiptUrl(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[85vh] flex flex-col z-10 animate-scale-in">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-sm">
                <FileImage className="w-4.5 h-4.5 text-indigo-500" />
                Raw Uploaded Receipt Image
              </h3>
              <button 
                onClick={() => setSelectedReceiptUrl(null)} 
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-grow overflow-auto rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 p-2 flex items-center justify-center">
              <img src={selectedReceiptUrl} alt="Receipt Signed Preview" className="max-h-[60vh] object-contain rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
