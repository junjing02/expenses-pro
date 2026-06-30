import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, X, Trash2, Loader2, Target, PiggyBank, ArrowUpRight } from 'lucide-react';

export default function GoalsManager({ userId, accounts = [], onGoalUpdated }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add goal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Allocate savings states
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');

  const fetchGoals = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setGoals(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
    if (accounts.length > 0) {
      setSourceAccountId(accounts[0].id);
    }
  }, [userId, accounts]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const targetVal = parseFloat(targetAmount);
      if (isNaN(targetVal) || targetVal <= 0) {
        throw new Error('Target amount must be a positive number.');
      }

      const { error: insertError } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          name: name.trim(),
          target_amount: targetVal,
          current_amount: 0.00,
          target_date: targetDate || null
        });

      if (insertError) throw insertError;

      setSuccess('Goal created successfully!');
      setName('');
      setTargetAmount('');
      setTargetDate('');
      setShowAddForm(false);
      fetchGoals();
      if (onGoalUpdated) onGoalUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAllocateSavings = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !allocateAmount || !sourceAccountId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const amountVal = parseFloat(allocateAmount);
      const sourceAccount = accounts.find(a => a.id === sourceAccountId);

      if (isNaN(amountVal) || amountVal <= 0) {
        throw new Error('Savings amount must be positive.');
      }

      if (sourceAccount.current_balance < amountVal) {
        throw new Error(`Insufficient funds in ${sourceAccount.name} wallet.`);
      }

      // 1. Deduct from account by adding a "Transfer/Savings" transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          account_id: sourceAccountId,
          type: 'expense',
          amount: amountVal,
          category: 'Savings',
          description: `Allocated to ${selectedGoal.name}`
        });

      if (txError) throw txError;

      // 2. Add savings to goal's current_amount
      const newSavedAmount = parseFloat(selectedGoal.current_amount || 0) + amountVal;
      const { error: goalUpdateError } = await supabase
        .from('goals')
        .update({ current_amount: newSavedAmount })
        .eq('id', selectedGoal.id);

      if (goalUpdateError) throw goalUpdateError;

      setSuccess(`Allocated RM ${amountVal.toFixed(2)} to ${selectedGoal.name}!`);
      setAllocateAmount('');
      setSelectedGoal(null);
      fetchGoals();
      if (onGoalUpdated) onGoalUpdated(); // refresh App state (balances)
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    const confirmDelete = confirm('Are you sure you want to delete this savings goal? Saved progress stats will be removed.');
    if (!confirmDelete) return;

    try {
      const { error: deleteError } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (deleteError) throw deleteError;
      fetchGoals();
      if (onGoalUpdated) onGoalUpdated();
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/40 shadow-premium space-y-6">
      
      {/* Header section */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-50 dark:border-slate-850">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            Savings Goals
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Plan and fund your future milestones</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl flex items-center gap-1 hover:bg-indigo-100/60 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Message banners */}
      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/40 text-rose-600 rounded-2xl text-[10px] flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/40 text-emerald-650 dark:text-emerald-450 rounded-2xl text-[10px] flex items-center gap-1.5">
          <PiggyBank className="w-4 h-4 animate-bounce" />
          <span>{success}</span>
        </div>
      )}

      {/* Goals progress panels */}
      {goals.length === 0 ? (
        <div className="text-center py-10 text-slate-450 italic text-xs">
          No savings goals configured. Plan your next savings milestone!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const target = parseFloat(goal.target_amount);
            const saved = parseFloat(goal.current_amount || 0);
            const pct = Math.round((saved / target) * 100);
            
            return (
              <div key={goal.id} className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/60 dark:border-slate-850/50 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{goal.name}</h4>
                      {goal.target_date && (
                        <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
                          Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedGoal(goal)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black tracking-wide flex items-center gap-0.5 active:scale-95 transition-all"
                      >
                        <ArrowUpRight className="w-2.5 h-2.5" /> Fund
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 text-slate-350 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Circular/Linear Progress Meter */}
                  <div className="w-full bg-slate-200/50 dark:bg-slate-950 rounded-full h-2 mt-4 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(pct, 100)}%` }} 
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1">
                  <span>Saved: RM {saved.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span>Goal: RM {target.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal A: New Goal Form Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border border-slate-100 dark:border-slate-800 animate-scale-in">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50 dark:border-slate-850">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Create Savings Goal</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Goal Name / Item
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, Japan Trip"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Target Amount (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Goal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal B: Allocate Savings Drawer */}
      {selectedGoal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border border-slate-100 dark:border-slate-800 animate-scale-in">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50 dark:border-slate-850">
              <h3 className="text-xs font-bold text-slate-850 dark:text-white">Fund: {selectedGoal.name}</h3>
              <button onClick={() => setSelectedGoal(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAllocateSavings} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Amount to Save (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={allocateAmount}
                  onChange={(e) => setAllocateAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Source Wallet / Account
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (RM {parseFloat(acc.current_balance || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Deposit'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
