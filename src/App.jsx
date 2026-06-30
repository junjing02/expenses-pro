import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import HomeLedger from './components/HomeLedger';
import WalletList from './components/WalletList';
import StatisticsReports from './components/StatisticsReports';
import TransactionForm from './components/TransactionForm';
import ReceiptScanner from './components/ReceiptScanner';
import ImportExport from './components/ImportExport';
import SubscriptionsManager from './components/SubscriptionsManager';
import Dashboard from './components/Dashboard'; // Reused as budget configuration subpanel
import { 
  Home, Wallet, BarChart2, Settings, Plus, X, LogOut, Moon, Sun, 
  Loader2, RefreshCw, Mail, Lock, UserPlus, LogIn, Camera, FileText
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [darkMode, setDarkMode] = useState(false);
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'wallet', 'reports', 'settings'
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // 1. Session state hook
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Detect browser color scheme preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch User Data whenever session changes
  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (darkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Fetch accounts, transactions, and budgets from Supabase
  const fetchUserData = async () => {
    if (!session?.user) return;
    setDataLoading(true);
    try {
      // Fetch user accounts
      const { data: accountsData, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .order('name', { ascending: true });

      if (accError) throw accError;
      setAccounts(accountsData || []);

      // Fetch user transactions join with accounts
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts (
            name,
            type
          )
        `)
        .order('transaction_date', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      // Fetch user budgets
      const { data: budgetsData, error: budgetError } = await supabase
        .from('budgets')
        .select('*');

      if (budgetError) throw budgetError;
      setBudgets(budgetsData || []);
    } catch (err) {
      console.error('Error fetching data:', err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handlePopulateDemo = async () => {
    if (!session?.user?.id) return;
    setDemoLoading(true);
    try {
      const { populateDemoData } = await import('./utils/demoData');
      await populateDemoData(session.user.id);
      await fetchUserData();
      alert('Sandbox data populated successfully! Enjoy exploring Moneyboard Pro.');
    } catch (err) {
      alert('Failed to populate demo data: ' + err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  // Auth Submit Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        alert('Verification email sent! Check your inbox.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    const confirmSignOut = confirm('Are you sure you want to sign out?');
    if (confirmSignOut) {
      await supabase.auth.signOut();
      setAccounts([]);
      setTransactions([]);
      setBudgets([]);
    }
  };

  // Auth Portal Render DDL
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/80 shadow-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
              Moneyboard <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              {isSignUp ? 'Create your secure developer ledger profile' : 'Sign in to access your dashboard'}
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="junjingting@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Secure Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-650/20 active:scale-[0.99] disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Secure Login</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-xs"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Navigation Items
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'reports', label: 'Report', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-28 lg:pb-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header (Branding & Desktop Menu) */}
      <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/75 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab('home')}>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Moneyboard
            </span>
          </div>

          {/* Desktop Navigation Menu (hidden on mobile) */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/20 dark:border-slate-800/20">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setShowSubscriptions(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    active 
                      ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/10' 
                      : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-250'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchUserData}
              disabled={dataLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
            </button>

            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            >
              {darkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4" />}
            </button>

            <button 
              onClick={handleSignOut}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-100 dark:hover:border-rose-900/40 text-slate-500 hover:text-rose-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Presenter Area */}
      <main className="max-w-md lg:max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-grow">
        <div className="space-y-6">
          
          {/* TAB 1: HOME LEDGER */}
          {currentTab === 'home' && (
            <div className="space-y-6">
              {accounts.length === 0 && transactions.length === 0 && (
                <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200/30 dark:border-indigo-900/20 rounded-3xl p-6 text-center space-y-4 animate-scale-in">
                  <span className="text-3xl block">👋</span>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Welcome to Moneyboard Pro Sandbox!</h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Your ledger is currently empty. Click the button below to instantly populate your dashboard with realistic Malaysian demo data (wallets, transactions, budget limits, and savings goals) to see the app in action!
                  </p>
                  <button
                    onClick={handlePopulateDemo}
                    disabled={demoLoading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-650/15 transition-all flex items-center justify-center gap-1.5 mx-auto"
                  >
                    {demoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '📊 Populate Demo Sandbox'}
                  </button>
                </div>
              )}

              <HomeLedger 
                userId={session.user.id} 
                accounts={accounts} 
                transactions={transactions} 
                onTransactionDeleted={fetchUserData} 
              />
            </div>
          )}

          {/* TAB 2: WALLETS */}
          {currentTab === 'wallet' && (
            <WalletList 
              userId={session.user.id} 
              accounts={accounts} 
              onAccountAdded={fetchUserData} 
            />
          )}

          {/* TAB 3: REPORTS / STATISTICS */}
          {currentTab === 'reports' && (
            <StatisticsReports 
              transactions={transactions} 
            />
          )}

          {/* TAB 4: SETTINGS & SUBPANELS */}
          {currentTab === 'settings' && (
            <div className="space-y-6 animate-scale-in">
              {showSubscriptions ? (
                <SubscriptionsManager 
                  userId={session.user.id} 
                  accounts={accounts} 
                  onClose={() => setShowSubscriptions(false)}
                />
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Settings</h2>
                    
                    {/* Recurring Subscriptions Link Button */}
                    <button
                      onClick={() => setShowSubscriptions(true)}
                      className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl text-left flex justify-between items-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🗓️</span>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-750 dark:text-slate-105">Recurring & Subscriptions</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Manage fixed bills, loans, and music configs</p>
                        </div>
                      </div>
                      <span className="text-slate-400 text-xs font-bold font-mono">→</span>
                    </button>
                  </div>

                  {/* Budgets Management section */}
                  <Dashboard 
                    accounts={accounts} 
                    transactions={transactions} 
                    budgets={budgets} 
                    userId={session.user.id}
                    onBudgetUpdated={fetchUserData}
                  />

                  {/* CSV Backups section */}
                  <ImportExport 
                    userId={session.user.id} 
                    accounts={accounts} 
                    transactions={transactions}
                    onDataImported={fetchUserData} 
                  />
                </>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Floating Bottom Tab Bar (Mobile/Tablet View - match 1.png / 5.png exactly!) */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-slate-200/50 dark:border-slate-800/80 rounded-3xl py-2.5 px-4 shadow-xl flex items-center justify-between">
        {/* Left two nav items: Home, Wallet */}
        <div className="flex justify-around items-center w-2/5">
          {navItems.slice(0, 2).map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id && !showSubscriptions;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setShowSubscriptions(false);
                }}
                className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-black">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Central blue FAB button */}
        <button
          onClick={() => setShowFabMenu(true)}
          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-550 text-white flex items-center justify-center shadow-lg transform -translate-y-4 shadow-indigo-650/30 z-50 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Right two nav items: Report, Settings */}
        <div className="flex justify-around items-center w-2/5">
          {navItems.slice(2, 4).map(item => {
            const Icon = item.icon;
            const active = (currentTab === item.id) || (item.id === 'settings' && showSubscriptions);
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (item.id !== 'settings') setShowSubscriptions(false);
                }}
                className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-black">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: FAB Options Menu Modal overlay */}
      {showFabMenu && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowFabMenu(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl p-6 shadow-2xl border-t border-slate-100 dark:border-slate-800 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-50 dark:border-slate-850">
              <h2 className="text-sm font-bold text-slate-850 dark:text-white">Record Transaction</h2>
              <button onClick={() => setShowFabMenu(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4.5 h-4.5 text-slate-400" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Scan Receipt */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowScanner(true);
                }}
                className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl text-center hover:scale-[1.03] transition-all flex flex-col items-center gap-2"
              >
                <Camera className="w-7 h-7 text-indigo-600" />
                <span className="text-xs font-black text-indigo-750 dark:text-indigo-400">Scan Receipt</span>
              </button>

              {/* Manual entry */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowAddForm(true);
                }}
                className="p-5 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 rounded-2xl text-center hover:scale-[1.03] transition-all flex flex-col items-center gap-2"
              >
                <FileText className="w-7 h-7 text-violet-600" />
                <span className="text-xs font-black text-violet-750 dark:text-violet-400">Manual Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Manual Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl relative border border-slate-100 dark:border-slate-800 animate-scale-in">
            <button onClick={() => setShowAddForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 z-10">
              <X className="w-4.5 h-4.5 text-slate-400" />
            </button>
            <div className="mt-2">
              <TransactionForm 
                userId={session.user.id} 
                accounts={accounts} 
                budgets={budgets}
                onTransactionSaved={fetchUserData}
                onClose={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: OCR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 shadow-2xl relative border border-slate-100 dark:border-slate-800 animate-scale-in">
            <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 z-10">
              <X className="w-4.5 h-4.5 text-slate-400" />
            </button>
            <div className="mt-2 max-h-[80vh] overflow-y-auto no-scrollbar">
              <ReceiptScanner 
                userId={session.user.id} 
                accounts={accounts} 
                budgets={budgets}
                onTransactionSaved={() => { fetchUserData(); setShowScanner(false); }} 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
