import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Dashboard from './components/Dashboard';
import AccountCard from './components/AccountCard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import ReceiptScanner from './components/ReceiptScanner';
import ImportExport from './components/ImportExport';
import { 
  Wallet, LogOut, Moon, Sun, Plus, X, 
  Mail, Lock, UserPlus, LogIn, Loader2, RefreshCw,
  LayoutDashboard, Receipt, Camera, Landmark, Database, CheckCircle
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
  const [dataLoading, setDataLoading] = useState(false);
  
  const [darkMode, setDarkMode] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard', 'ledger', 'ocr', 'accounts', 'backups'
  const [showAddForm, setShowAddForm] = useState(false);

  // 1. Session state hook
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Load financial records once session is active
  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    } else {
      setAccounts([]);
      setTransactions([]);
    }
  }, [session]);

  // 3. Dark mode state sync
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Fetch accounts and transactions from Supabase
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
    } catch (err) {
      console.error('Error fetching data:', err.message);
    } finally {
      setDataLoading(false);
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
        alert('Verification email sent! Check your inbox or continue.');
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
    await supabase.auth.signOut();
  };

  // Unauthenticated Auth Screen
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/80 shadow-2xl relative z-10 animate-scale-in">
          
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mx-auto mb-4">
              <Wallet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              ApexLedger
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Zero-Server Expense Tracker & OCR Receipt Scanner
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  placeholder="name@domain.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-50 hover:to-violet-50 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 border-t border-slate-100 dark:border-slate-850 pt-4 text-xs">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up Now"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Navigation Configurations
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ledger', label: 'Ledger', icon: Receipt },
    { id: 'ocr', label: 'OCR Scanner', icon: Camera },
    { id: 'accounts', label: 'Accounts', icon: Landmark },
    { id: 'backups', label: 'CSV Backups', icon: Database },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-28 lg:pb-8">
      {/* Header (Branding & Desktop Menu) */}
      <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/75 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Wallet className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                ApexLedger
              </span>
            </div>
          </div>

          {/* Desktop Navigation Menu (hidden on mobile) */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/20 dark:border-slate-800/20">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    active 
                      ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/10' 
                      : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-205'
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
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-grow">
        
        {/* Render Tab Contents */}
        <div className="space-y-6">
          
          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="animate-scale-in">
              <Dashboard accounts={accounts} transactions={transactions} />
              
              {/* Desktop quick helper grid */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 hidden lg:grid">
                <div className="bg-slate-100/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase mb-2">📷 Receipt Scan Shortcut</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">Upload receipt photos for browser-side text processing.</p>
                  <button onClick={() => setCurrentTab('ocr')} className="px-3.5 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-xs">Open OCR Tool</button>
                </div>
                <div className="bg-slate-100/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase mb-2">📁 Import CSV Records</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">Import banking rows or export database backups easily.</p>
                  <button onClick={() => setCurrentTab('backups')} className="px-3.5 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-xs">Open Data Hub</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTORY LEDGER */}
          {currentTab === 'ledger' && (
            <div className="space-y-5 animate-scale-in">
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-805">
                <span className="text-xs font-bold text-slate-500">Record a manual transaction?</span>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
                >
                  {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{showAddForm ? 'Close Form' : 'New Transaction'}</span>
                </button>
              </div>

              {showAddForm && (
                <div className="animate-scale-in">
                  <TransactionForm 
                    userId={session.user.id} 
                    accounts={accounts} 
                    onTransactionSaved={fetchUserData}
                    onClose={() => setShowAddForm(false)}
                  />
                </div>
              )}

              <TransactionList 
                userId={session.user.id} 
                transactions={transactions} 
                onTransactionDeleted={fetchUserData} 
              />
            </div>
          )}

          {/* TAB 3: OCR SCANNER */}
          {currentTab === 'ocr' && (
            <div className="animate-scale-in">
              <ReceiptScanner 
                userId={session.user.id} 
                accounts={accounts} 
                onTransactionSaved={fetchUserData} 
              />
            </div>
          )}

          {/* TAB 4: ACCOUNTS */}
          {currentTab === 'accounts' && (
            <div className="animate-scale-in max-w-lg mx-auto">
              <AccountCard 
                userId={session.user.id} 
                accounts={accounts} 
                onAccountAdded={fetchUserData} 
              />
            </div>
          )}

          {/* TAB 5: BACKUPS & CSV */}
          {currentTab === 'backups' && (
            <div className="animate-scale-in">
              <ImportExport 
                userId={session.user.id} 
                accounts={accounts} 
                transactions={transactions}
                onDataImported={fetchUserData} 
              />
            </div>
          )}

        </div>
      </main>

      {/* Floating Bottom Tab Bar (Mobile/Tablet View - hidden on large screens) */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/50 dark:border-slate-800/80 rounded-2xl py-2 px-3 shadow-xl flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1.5 px-3.5 rounded-xl transition-all ${
                active 
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold tracking-tight">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
