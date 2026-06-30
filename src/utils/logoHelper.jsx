import React from 'react';
import { CreditCard, Landmark, Wallet, CircleDollarSign, Music, Home, HelpCircle } from 'lucide-react';

/**
 * Returns a beautiful logo/badge representing a merchant
 */
export const getMerchantLogo = (name = '') => {
  const clean = name.toLowerCase().trim();
  
  if (clean.includes('lazada')) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-sm shrink-0">
        ❤️
      </div>
    );
  }
  if (clean.includes('shopee')) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
        🛍️
      </div>
    );
  }
  if (clean.includes('pdd') || clean.includes('pinduoduo') || clean.includes('temu')) {
    return (
      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm shrink-0 border border-red-500/25">
        PDD
      </div>
    );
  }
  if (clean.includes('mrdiy') || clean.includes('mr diy')) {
    return (
      <div className="w-8 h-8 rounded-full bg-yellow-450 border border-yellow-300 flex items-center justify-center text-slate-800 text-[9px] font-black shadow-sm shrink-0">
        🔨
      </div>
    );
  }
  if (clean.includes('grab')) {
    return (
      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
        🟢
      </div>
    );
  }
  if (clean.includes('spotify')) {
    return (
      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
        <Music className="w-4 h-4 fill-emerald-500" />
      </div>
    );
  }
  if (clean.includes('house loan') || clean.includes('loan') || clean.includes('rent') || clean.includes('mortgage')) {
    return (
      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shadow-sm shrink-0">
        <Home className="w-4 h-4" />
      </div>
    );
  }
  
  // Default circular initials
  const initials = name.slice(0, 2).toUpperCase() || 'TX';
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-650 dark:text-slate-400 text-[10px] font-bold shrink-0">
      {initials}
    </div>
  );
};

/**
 * Returns a beautiful logo representing a wallet/bank
 */
export const getWalletLogo = (name = '') => {
  const clean = name.toLowerCase().trim();

  if (clean.includes('maybank')) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-400 border border-amber-300 flex items-center justify-center text-slate-900 text-xs font-black shadow-sm shrink-0">
        🐯
      </div>
    );
  }
  if (clean.includes('cimb')) {
    return (
      <div className="w-8 h-8 rounded-full bg-red-650 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
        🔺
      </div>
    );
  }
  if (clean.includes('tng') || clean.includes('touch n go')) {
    return (
      <div className="w-8 h-8 rounded-full bg-blue-650 flex items-center justify-center text-white text-[8px] font-extrabold shadow-sm shrink-0">
        TnG
      </div>
    );
  }
  if (clean.includes('cash')) {
    return (
      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
        💵
      </div>
    );
  }

  // Fallbacks
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
      <Landmark className="w-4 h-4" />
    </div>
  );
};
