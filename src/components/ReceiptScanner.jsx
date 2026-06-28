import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { processReceiptOCR } from '../utils/ocrProcessor';
import { Upload, Camera, FileText, Loader2, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function ReceiptScanner({ userId, accounts, onTransactionSaved }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Set default account if available
  React.useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Handle Drag & Drop / File Select
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setupFile(selectedFile);
    }
  };

  const setupFile = (selectedFile) => {
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setParsedData(null);
    setError('');
    setSuccess('');
  };

  // Perform Client-side OCR
  const handleOCRScan = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);
    setError('');

    try {
      const response = await processReceiptOCR(file, (pct) => setProgress(pct));
      if (response.success) {
        setParsedData(response.parsedData);
        setSuccess('Receipt scanned and text processed locally!');
      } else {
        setError('Could not scan receipt. Please input values manually.');
        setParsedData({
          vendor: '',
          date: new Date().toISOString().split('T')[0],
          totalAmount: 0.00,
          lineItems: [{ item_name: 'Receipt Expense', quantity: 1, unit_price: 0, total_price: 0 }]
        });
      }
    } catch (err) {
      setError('An error occurred during OCR: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle updates to fields (OCR reviews)
  const handleDataChange = (field, value) => {
    setParsedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedLineItems = [...parsedData.lineItems];
    updatedLineItems[index][field] = value;

    // Auto-calculate total price
    if (field === 'quantity' || field === 'unit_price') {
      const q = parseFloat(updatedLineItems[index].quantity) || 0;
      const p = parseFloat(updatedLineItems[index].unit_price) || 0;
      updatedLineItems[index].total_price = parseFloat((q * p).toFixed(2));
    }
    
    // Auto-calculate aggregate total
    const newTotal = updatedLineItems.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

    setParsedData(prev => ({
      ...prev,
      lineItems: updatedLineItems,
      totalAmount: parseFloat(newTotal.toFixed(2))
    }));
  };

  const addLineItem = () => {
    setParsedData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { item_name: '', quantity: 1, unit_price: 0.00, total_price: 0.00 }]
    }));
  };

  const removeLineItem = (index) => {
    const list = [...parsedData.lineItems];
    list.splice(index, 1);
    const newTotal = list.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
    
    setParsedData(prev => ({
      ...prev,
      lineItems: list,
      totalAmount: parseFloat(newTotal.toFixed(2))
    }));
  };

  // Upload image to Storage bucket & Insert records to Supabase Postgres
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!userId || !selectedAccountId || !parsedData) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let receiptImageUrl = null;

      // 1. Upload receipt to Supabase Storage inside the private 'receipts' bucket
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        
        // Save the storage file path
        receiptImageUrl = fileName;
      }

      // 2. Insert transaction directly into Supabase Postgres
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          account_id: selectedAccountId,
          type: 'expense', // Receipts are expenses
          amount: parsedData.totalAmount,
          category: 'shopping', // Default category, user can edit
          description: parsedData.vendor,
          transaction_date: parsedData.date,
          receipt_image_url: receiptImageUrl
        })
        .select()
        .single();

      if (txError) throw new Error(`Failed to save transaction: ${txError.message}`);

      // 3. Insert line items if any parsed
      if (parsedData.lineItems && parsedData.lineItems.length > 0) {
        const itemsToInsert = parsedData.lineItems.map(item => ({
          user_id: userId,
          transaction_id: txData.id,
          item_name: item.item_name || 'Receipt Item',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        const { error: itemsError } = await supabase
          .from('receipt_items')
          .insert(itemsToInsert);

        if (itemsError) throw new Error(`Failed to save receipt items: ${itemsError.message}`);
      }

      setSuccess('Transaction and receipt items saved successfully!');
      setFile(null);
      setPreviewUrl(null);
      setParsedData(null);
      
      if (onTransactionSaved) {
        onTransactionSaved(); // Refresh parent dashboard
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-premium border border-slate-100 dark:border-slate-800/40">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
        <Camera className="w-5 h-5 text-indigo-500" />
        Client-Side Receipt Scanner
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
        Upload receipt images. Powered by local Tesseract.js OCR, processing runs 100% in your browser.
      </p>

      {/* Messages */}
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

      {/* Drag & Drop Upload Zone */}
      {!previewUrl && (
        <div 
          onClick={() => fileInputRef.current.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <Upload className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
          <span className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            Choose Receipt Image
          </span>
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">
            Supports PNG, JPEG or WebP up to 5MB
          </span>
        </div>
      )}

      {/* Image Preview & Scanner Trigger */}
      {previewUrl && !parsedData && (
        <div className="space-y-4 animate-scale-in">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 aspect-video max-h-56 flex items-center justify-center">
            <img src={previewUrl} alt="Receipt Preview" className="object-contain h-full w-full" />
            <button 
              onClick={() => { setFile(null); setPreviewUrl(null); }}
              className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg p-1.5 text-xs transition-colors"
            >
              Change
            </button>
          </div>

          <button
            onClick={handleOCRScan}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-600/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running local OCR ({progress}%) ...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Scan Receipt Locally</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Parse Review & Save Form */}
      {parsedData && (
        <form onSubmit={handleSaveTransaction} className="space-y-5 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 animate-slide-in">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Verify Extraction Results
          </div>

          {/* Account Selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Charge Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type}) - ${acc.current_balance}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Vendor Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Vendor
              </label>
              <input 
                type="text" 
                value={parsedData.vendor} 
                onChange={(e) => handleDataChange('vendor', e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Date
              </label>
              <input 
                type="date" 
                value={parsedData.date} 
                onChange={(e) => handleDataChange('date', e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Line items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Line Items
              </label>
              <button 
                type="button" 
                onClick={addLineItem}
                className="text-[10px] font-extrabold text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            {parsedData.lineItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <input 
                  type="text" 
                  placeholder="Item description"
                  value={item.item_name}
                  onChange={(e) => handleLineItemChange(idx, 'item_name', e.target.value)}
                  className="flex-grow bg-transparent text-xs focus:outline-none border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 py-0.5"
                />
                <input 
                  type="number" 
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleLineItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                  className="w-12 text-center bg-transparent text-xs focus:outline-none border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 py-0.5"
                />
                <span className="text-slate-400 text-xs">x</span>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Price"
                  value={item.unit_price}
                  onChange={(e) => handleLineItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="w-16 text-right bg-transparent text-xs focus:outline-none border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 py-0.5 font-semibold"
                />
                <span className="text-slate-400 text-xs">=</span>
                <span className="text-xs font-bold w-16 text-right text-slate-700 dark:text-slate-300">
                  ${(item.total_price || 0).toFixed(2)}
                </span>
                <button 
                  type="button" 
                  onClick={() => removeLineItem(idx)}
                  className="text-slate-400 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Sum total */}
          <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/60 pt-3">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total Charged Amount</span>
            <input 
              type="number" 
              step="0.01"
              value={parsedData.totalAmount}
              onChange={(e) => handleDataChange('totalAmount', parseFloat(e.target.value) || 0)}
              className="text-lg font-black text-right text-indigo-600 dark:text-indigo-400 bg-transparent w-28 focus:outline-none border-b border-transparent focus:border-indigo-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setFile(null); setPreviewUrl(null); setParsedData(null); }}
              className="w-1/3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-indigo-600/10 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save Transaction</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
