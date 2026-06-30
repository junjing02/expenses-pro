import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getWalletLogo } from '../utils/logoHelper';
import { Calendar, Bell, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function BillCalendar({ userId, accounts = [] }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSubscriptions = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('next_payment_date', { ascending: true });

      if (fetchError) throw fetchError;
      setSubscriptions(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [userId]);

  // Calculations for billing status
  const now = new Date();
  
  const getBillingStatus = (nextDateStr) => {
    if (!nextDateStr) return { label: 'Flexible', color: 'text-slate-400', badgeColor: 'bg-slate-100 dark:bg-slate-900' };
    
    const nextDate = new Date(nextDateStr);
    const timeDiff = nextDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return { label: `Overdue by ${Math.abs(daysDiff)} days`, color: 'text-rose-500', badgeColor: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' };
    }
    if (daysDiff === 0) {
      return { label: 'Due Today', color: 'text-amber-500 font-bold', badgeColor: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' };
    }
    if (daysDiff <= 3) {
      return { label: `Due in ${daysDiff} days`, color: 'text-amber-500', badgeColor: 'bg-amber-55/20 text-amber-600' };
    }
    return { label: `In ${daysDiff} days`, color: 'text-slate-450', badgeColor: 'bg-slate-100 dark:bg-slate-900 text-slate-500' };
  };

  const getAccountName = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    return acc ? acc.name : 'Unknown Wallet';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/40 shadow-premium space-y-6">
      
      {/* Title */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-50 dark:border-slate-850">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Bill Calendar</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Upcoming payments and scheduled reminders</p>
          </div>
        </div>
        <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-950 text-indigo-500 flex items-center justify-center text-xs font-black">
          {subscriptions.length}
        </span>
      </div>

      {/* Subscriptions Reminder list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-10 text-slate-450 italic text-xs">
          No upcoming bills or recurring payments registered.
        </div>
      ) : (
        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
          {subscriptions.map(sub => {
            const status = getBillingStatus(sub.next_payment_date);
            const accName = getAccountName(sub.account_id);
            const nextDateObj = sub.next_payment_date ? new Date(sub.next_payment_date) : null;
            
            return (
              <div key={sub.id} className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-850/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  
                  {/* Calendar Badge */}
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/30 text-indigo-650 flex flex-col items-center justify-center font-bold">
                    <span className="text-[7px] uppercase font-black tracking-wider text-indigo-400">
                      {nextDateObj ? nextDateObj.toLocaleString('en-US', { month: 'short' }) : 'N/A'}
                    </span>
                    <span className="text-xs leading-none mt-0.5">
                      {nextDateObj ? nextDateObj.getDate() : '-'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-205">{sub.name}</h4>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                      {getWalletLogo(accName)}
                      <span>via {accName}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-slate-850 dark:text-white block">
                    RM {parseFloat(sub.amount).toFixed(2)}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-1.5 inline-block ${status.badgeColor}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer message */}
      <div className="flex items-center gap-1.5 p-3.5 bg-indigo-50/25 dark:bg-indigo-950/5 border border-indigo-100/30 rounded-2xl text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
        <span>ApexLedger checks your budgets and recurring bills client-side. Make sure to replenish accounts on time.</span>
      </div>

    </div>
  );
}
