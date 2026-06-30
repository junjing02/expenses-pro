import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ImportExport({ userId, accounts, transactions, onDataImported }) {
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Export Transactions to CSV
  const handleExportCSV = () => {
    try {
      if (transactions.length === 0) {
        setError('No transactions available to export.');
        return;
      }

      // CSV Headers
      const headers = ['Date', 'Description', 'Type', 'Amount', 'Category', 'Account Name', 'Account Type'];
      
      // Map rows
      const rows = transactions.map(tx => [
        tx.transaction_date,
        `"${tx.description.replace(/"/g, '""')}"`, // Escape quotes
        tx.type,
        tx.amount,
        tx.category,
        `"${(tx.accounts?.name || 'Unknown Account').replace(/"/g, '""')}"`,
        tx.accounts?.type || 'Other'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `apexledger_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      
      setSuccess('CSV database exported successfully!');
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  };

  // 2. Parse CSV File
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCSVText(text);
        if (parsed.length === 0) {
          throw new Error('No valid transaction rows found in the CSV file.');
        }
        setPreviewRows(parsed);
      } catch (err) {
        setError(`Failed to parse CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  // Safe RFC 4180 CSV parser to handle quotes, commas and newlines in values
  const parseCSVText = (text) => {
    const parsedLines = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // Skip escape char
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        parsedLines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      parsedLines.push(row);
    }

    if (parsedLines.length === 0) return [];

    // Find the header row (skipping empty lines and comments starting with #)
    let headerIdx = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      const firstVal = parsedLines[i][0]?.trim() || '';
      if (firstVal && !firstVal.startsWith('#')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1 || headerIdx >= parsedLines.length) {
      throw new Error('CSV must contain a column headers row.');
    }

    const headers = parsedLines[headerIdx].map(h => h.trim().toLowerCase());
    const dataLines = parsedLines.slice(headerIdx + 1).filter(line => {
      if (line.length === 0 || (line.length === 1 && line[0] === '')) return false;
      const firstVal = line[0]?.trim() || '';
      return !firstVal.startsWith('#');
    });

    const dateIdx = headers.findIndex(h => h === 'date');
    const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('merchant') || h.includes('item') || h === 'name');
    
    // Detect single Amount vs double Expense/Income columns
    const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('price'));
    const expenseIdx = headers.findIndex(h => h === 'expense');
    const incomeIdx = headers.findIndex(h => h === 'income');

    const catIdx = headers.findIndex(h => h.includes('cat'));
    const accIdx = headers.findIndex(h => h.includes('acc'));

    const hasSingleAmount = amtIdx !== -1;
    const hasDoubleAmount = expenseIdx !== -1 && incomeIdx !== -1;

    if (dateIdx === -1 || descIdx === -1 || (!hasSingleAmount && !hasDoubleAmount)) {
      throw new Error('CSV must contain column headers for Date, Description (or Name), and Amount (or Expense/Income).');
    }

    // Currencies parser
    const parseCurrencyString = (str) => {
      if (!str) return 0.00;
      // Strip currency signs, whitespace, thousands commas, keep decimals
      const sanitized = str.replace(/[^0-9.-]/g, '');
      const val = parseFloat(sanitized);
      return isNaN(val) ? 0.00 : Math.abs(val);
    };

    // Date parser for DD/MM/YYYY & standard dates
    const parseCustomDate = (str) => {
      if (!str) return new Date().toISOString().split('T')[0];
      const ddMmYyyyRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
      const match = str.match(ddMmYyyyRegex);
      if (match) {
        const [_, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    };

    return dataLines.map(line => {
      let type = 'expense';
      let amount = 0.00;

      if (hasDoubleAmount) {
        const rawExpense = line[expenseIdx]?.trim() || '';
        const rawIncome = line[incomeIdx]?.trim() || '';

        if (rawIncome && rawIncome !== '') {
          type = 'income';
          amount = parseCurrencyString(rawIncome);
        } else if (rawExpense && rawExpense !== '') {
          type = 'expense';
          amount = parseCurrencyString(rawExpense);
        }
      } else {
        const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('flow'));
        const rawType = typeIdx !== -1 ? line[typeIdx]?.trim().toLowerCase() : 'expense';
        type = rawType.includes('inc') || rawType === 'deposit' || rawType === 'credit' ? 'income' : 'expense';
        const rawAmt = line[amtIdx] ? line[amtIdx] : '0';
        amount = parseCurrencyString(rawAmt);
      }

      const rawDate = line[dateIdx]?.trim();
      const formattedDate = parseCustomDate(rawDate);

      return {
        date: formattedDate,
        description: line[descIdx]?.trim() || 'Imported Transaction',
        type,
        amount,
        category: catIdx !== -1 && line[catIdx] ? line[catIdx].trim().toLowerCase() : 'shopping',
        accountName: accIdx !== -1 && line[accIdx] ? line[accIdx].trim() : 'Checking'
      };
    }).filter(row => row.amount > 0);
  };

  // 3. Save Parsed Transactions to Supabase
  const handleImportSave = async () => {
    if (previewRows.length === 0 || !userId) return;
    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const activeAccounts = [...accounts];

      // Map of accountName -> accountId
      const accountMap = {};
      activeAccounts.forEach(acc => {
        accountMap[acc.name.toLowerCase()] = acc.id;
      });

      // Find any distinct account names in import list that do not exist, and create them!
      const uniqueImportAccounts = [...new Set(previewRows.map(row => row.accountName))];
      
      for (const accName of uniqueImportAccounts) {
        const lowerName = accName.toLowerCase();
        if (!accountMap[lowerName]) {
          // Auto create missing accounts
          const { data: newAcc, error: createAccError } = await supabase
            .from('accounts')
            .insert({
              user_id: userId,
              name: accName,
              type: accName.toLowerCase().includes('card') ? 'Credit Card' : 'Checking',
              current_balance: 0.00
            })
            .select()
            .single();

          if (createAccError) throw new Error(`Could not create account "${accName}": ${createAccError.message}`);
          
          accountMap[lowerName] = newAcc.id;
        }
      }

      // Map rows to Supabase schema format
      const transactionsToInsert = previewRows.map(row => ({
        user_id: userId,
        account_id: accountMap[row.accountName.toLowerCase()],
        type: row.type,
        amount: row.amount,
        category: sanitizeCategory(row.category, row.type),
        description: row.description,
        transaction_date: row.date
      }));

      // Bulk Insert into Supabase
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (insertError) throw insertError;

      setSuccess(`Successfully imported ${transactionsToInsert.length} transactions!`);
      setPreviewRows([]);
      
      if (onDataImported) {
        onDataImported(); // Refresh parents dashboard
      }
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const sanitizeCategory = (cat, type) => {
    if (!cat) return type === 'income' ? 'Other Income' : 'Other Expense';
    
    const formatted = cat.trim().toLowerCase();
    
    // Aligned to Moneyboard categories list
    const list = type === 'income' 
      ? ['Salary', 'Investments', 'Freelance', 'Gifts', 'Other Income']
      : ['Eating Out', 'Shopping', 'Sports', 'Entertainment', 'Fuel', 'Travel', 'Public Transport', 'Other Expense'];
    
    // 1. Check exact match
    const matched = list.find(l => l.toLowerCase() === formatted);
    if (matched) return matched;
    
    // 2. Fuzzy match (e.g., checking stripped names)
    const simplifiedFormatted = formatted.replace(/[^a-z0-9]/g, '');
    const fuzzyMatched = list.find(l => l.toLowerCase().replace(/[^a-z0-9]/g, '') === simplifiedFormatted);
    if (fuzzyMatched) return fuzzyMatched;
    
    // 3. Fallback: Capitalize first letters of raw category and return it!
    return cat.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
        <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
        Data Backups & CSV Manager
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-550 mb-6">
        Export your transaction ledger to a spreadsheet CSV or import bank transactions.
      </p>

      {/* Message indicators */}
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

      {/* Row Split Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export Button */}
        <div className="border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl text-center flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
              Export Transactions
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">
              Download your complete transaction database as a standard CSV file.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4.5 h-4.5" />
            Export to CSV
          </button>
        </div>

        {/* Import Trigger */}
        <div className="border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl text-center flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide mb-1">
              Import Transactions
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">
              Upload bank statement files. Required fields: Date, Amount, Description.
            </p>
          </div>
          <label className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
            <Upload className="w-4.5 h-4.5" />
            Upload CSV File
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {/* CSV Preview Table */}
      {previewRows.length > 0 && (
        <div className="mt-6 border-t border-slate-100 dark:border-slate-800/65 pt-5 space-y-4 animate-scale-in">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Import Preview ({previewRows.length} Rows)
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewRows([])}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-750 rounded-lg text-[10px] font-semibold"
              >
                Discard
              </button>
              <button
                onClick={handleImportSave}
                disabled={importing}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
              >
                {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save Import
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 max-h-56 no-scrollbar">
            <table className="w-full text-[10px] text-left border-collapse bg-slate-50/50 dark:bg-slate-950/20">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold sticky top-0">
                <tr>
                  <th className="p-2 border-b border-slate-200/50 dark:border-slate-800">Date</th>
                  <th className="p-2 border-b border-slate-200/50 dark:border-slate-800">Description</th>
                  <th className="p-2 border-b border-slate-200/50 dark:border-slate-800">Type</th>
                  <th className="p-2 border-b border-slate-200/50 dark:border-slate-800">Amount</th>
                  <th className="p-2 border-b border-slate-200/50 dark:border-slate-800">Category</th>
                  <th className="p-2 border-b border-slate-200/50 dark:border-slate-800">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10">
                    <td className="p-2 text-slate-600 dark:text-slate-350">{row.date}</td>
                    <td className="p-2 text-slate-800 dark:text-slate-200 font-medium truncate max-w-[120px]">{row.description}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${row.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-slate-700 dark:text-slate-305">${row.amount.toFixed(2)}</td>
                    <td className="p-2 text-slate-500 dark:text-slate-450">{row.category}</td>
                    <td className="p-2 text-slate-500 dark:text-slate-450 italic">{row.accountName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
