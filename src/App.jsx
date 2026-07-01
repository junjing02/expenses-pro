import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import HomeLedger from './components/HomeLedger';
import WalletList from './components/WalletList';
import StatisticsReports from './components/StatisticsReports';
import TransactionForm from './components/TransactionForm';
import ReceiptScanner from './components/ReceiptScanner';
import ImportExport from './components/ImportExport';
import SubscriptionsManager from './components/SubscriptionsManager';
import GoalsManager from './components/GoalsManager';
import BillCalendar from './components/BillCalendar';
import FinanceInsights from './components/FinanceInsights';
import Dashboard from './components/Dashboard'; 
import ErrorBoundary from './components/ErrorBoundary';
import { 
  Home, Wallet, BarChart2, Settings, Plus, X, LogOut, Moon, Sun, 
  Loader2, RefreshCw, Mail, Lock, UserPlus, LogIn, Camera, FileText,
  Target, Calendar, Lightbulb, Landmark, Database, Layers
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
  
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'wallet', 'reports', 'settings'
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Session state hook
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Dark mode is default
    document.documentElement.classList.add('dark');

    return () => subscription.unsubscribe();
  }, []);

  // Fetch User Data whenever session changes
  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  // Fetch accounts, transactions, and budgets from Supabase
  const fetchUserData = async () => {
    if (!session?.user) return;
    setDataLoading(true);
    try {
      const { data: accountsData, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .order('name', { ascending: true });

      if (accError) throw accError;
      setAccounts(accountsData || []);

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

  // Auth Portal Render
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 transition-colors relative overflow-hidden">
        {/* Glowing cyber backdrops */}
        <div className="glow-blur top-10 left-10 bg-indigo-500/20"></div>
        <div className="glow-blur bottom-10 right-10 bg-purple-500/20"></div>

        <div className="cyber-card max-w-md w-full rounded-3xl p-8 border border-white/5 space-y-6 relative z-10 animate-scale-in">
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-white">
              Moneyboard <span className="text-indigo-400 text-neon-indigo">Pro</span>
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              {isSignUp ? 'Create your secure developer ledger profile' : 'Sign in to access your dashboard'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-950/20 border border-rose-900/40 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
              <X className="w-4 h-4 text-rose-500" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-white/5 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-white/5 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-white"
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
              className="text-indigo-400 hover:underline font-semibold text-xs"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Bottom Tab Items
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'reports', label: 'Report', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen pb-28 lg:pb-12 bg-slate-950 text-slate-100 transition-colors relative overflow-hidden">
      
      {/* Background radial neon glows */}
      <div className="glow-blur top-0 right-1/4 bg-indigo-500/10"></div>
      <div className="glow-blur bottom-0 left-1/4 bg-violet-500/10"></div>

      {/* Header bar */}
      <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          
          {/* Brand logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab('home')}>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent text-neon-indigo">
              Moneyboard Pro
            </span>
          </div>

          {/* Desktop tab menus */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-900 border border-white/5 rounded-2xl">
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    active 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/20' 
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={fetchUserData}
              disabled={dataLoading}
              className="p-2.5 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-900 transition-colors text-slate-400 hover:text-slate-100"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
            </button>

            <button 
              onClick={handleSignOut}
              className="p-2.5 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-rose-950/20 text-slate-450 hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Presenter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
        
        {/* Onboarding Empty State banner */}
        {accounts.length === 0 && transactions.length === 0 && (
          <div className="cyber-card rounded-3xl p-6 text-center space-y-4 max-w-2xl mx-auto mb-8 animate-scale-in">
            <span className="text-3xl block">👋</span>
            <h3 className="text-base font-black text-white text-neon-indigo">Welcome to Moneyboard Pro Sandbox!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Your database ledger is currently empty. Click the button below to instantly populate your dashboard with realistic Malaysian bank accounts, credit cards, transactions, and savings goals.
            </p>
            <button
              onClick={handlePopulateDemo}
              disabled={demoLoading}
              className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-650/15 transition-all flex items-center justify-center gap-1.5 mx-auto"
            >
              {demoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '📊 Populate Demo Sandbox'}
            </button>
          </div>
        )}

        {/* 1. DESKTOP WORKSPACE (Futuristic Command Grid - Side by Side!) */}
        <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
          
          {/* Left Column (Colspan-3): Wallets Scorecards & Savings Targets */}
          <div className="col-span-3 space-y-6">
            <ErrorBoundary>
              <WalletList 
                userId={session.user.id} 
                accounts={accounts} 
                onAccountAdded={fetchUserData} 
              />
            </ErrorBoundary>
          </div>

          {/* Center Column (Colspan-6): Trend Charts & Grouped Ledger timeline */}
          <div className="col-span-6 space-y-6">
            
            {/* Top Quick Actions Panel */}
            <div className="cyber-card p-4 rounded-3xl flex justify-around items-center">
              <span className="text-xs font-bold text-slate-350 tracking-wide">Ledger Controls:</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-550 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Manual Transaction</span>
                </button>
                <button
                  onClick={() => setShowScanner(true)}
                  className="px-4 py-2 bg-slate-900 border border-white/5 text-slate-200 hover:bg-slate-850 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <span>Scan Receipt OCR</span>
                </button>
              </div>
            </div>

            {/* Statistics chart */}
            <ErrorBoundary>
              <StatisticsReports 
                transactions={transactions} 
              />
            </ErrorBoundary>

            {/* Daily timeline ledger */}
            <ErrorBoundary>
              <HomeLedger 
                userId={session.user.id} 
                accounts={accounts} 
                transactions={transactions} 
                onTransactionDeleted={fetchUserData} 
              />
            </ErrorBoundary>
          </div>

          {/* Right Column (Colspan-3): Subscriptions Reminders & Budgets config */}
          <div className="col-span-3 space-y-6">
            
            {/* Budgets threshold checker */}
            <ErrorBoundary>
              <Dashboard 
                accounts={accounts} 
                transactions={transactions} 
                budgets={budgets} 
                userId={session.user.id}
                onBudgetUpdated={fetchUserData}
              />
            </ErrorBoundary>

            {/* CSV Backup files manager */}
            <ErrorBoundary>
              <ImportExport 
                userId={session.user.id} 
                accounts={accounts} 
                transactions={transactions}
                onDataImported={fetchUserData} 
              />
            </ErrorBoundary>
          </div>

        </div>

        {/* 2. MOBILE WORKSPACE (Standard tab filtering slide) */}
        <div className="lg:hidden space-y-6">
          {currentTab === 'home' && (
            <div className="space-y-6">
              <HomeLedger 
                userId={session.user.id} 
                accounts={accounts} 
                transactions={transactions} 
                onTransactionDeleted={fetchUserData} 
              />
            </div>
          )}

          {currentTab === 'wallet' && (
            <WalletList 
              userId={session.user.id} 
              accounts={accounts} 
              onAccountAdded={fetchUserData} 
            />
          )}

          {currentTab === 'reports' && (
            <StatisticsReports 
              transactions={transactions} 
            />
          )}

          {currentTab === 'settings' && (
            <div className="space-y-6">
              {showSubscriptions ? (
                <SubscriptionsManager 
                  userId={session.user.id} 
                  accounts={accounts} 
                  onClose={() => setShowSubscriptions(false)}
                />
              ) : (
                <>
                  <button
                    onClick={() => setShowSubscriptions(true)}
                    className="w-full p-4 bg-slate-900 border border-white/5 rounded-3xl text-left flex justify-between items-center shadow-sm hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🗓️</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">Recurring & Subscriptions</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Manage fixed bills, loans, and music configs</p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-xs font-bold">→</span>
                  </button>

                  <Dashboard 
                    accounts={accounts} 
                    transactions={transactions} 
                    budgets={budgets} 
                    userId={session.user.id}
                    onBudgetUpdated={fetchUserData}
                  />

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

      </div>

      {/* Floating Bottom Tab Bar (Mobile/Tablet View only - glass-dock styling!) */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 glass-dock rounded-3xl py-2.5 px-4 flex items-center justify-between">
        {/* Left two tabs */}
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
                className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400 text-neon-indigo' : 'text-slate-400'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-black">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Central quick action trigger */}
        <button
          onClick={() => setShowFabMenu(true)}
          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-550 text-white flex items-center justify-center shadow-lg transform -translate-y-4 shadow-indigo-650/30 z-50 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Right two tabs */}
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
                className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400 text-neon-indigo' : 'text-slate-400'}`}
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowFabMenu(false)}>
          <div className="bg-slate-900 w-full max-w-sm rounded-t-3xl p-6 shadow-2xl border-t border-white/5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Record Transaction</h2>
              <button onClick={() => setShowFabMenu(false)} className="p-1 rounded-lg hover:bg-slate-800">
                <X className="w-4.5 h-4.5 text-slate-450" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowScanner(true);
                }}
                className="p-5 bg-indigo-950/20 border border-indigo-900/40 rounded-2xl text-center hover:scale-[1.03] transition-all flex flex-col items-center gap-2"
              >
                <Camera className="w-7 h-7 text-indigo-400" />
                <span className="text-xs font-black text-indigo-300">Scan Receipt</span>
              </button>

              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowAddForm(true);
                }}
                className="p-5 bg-purple-950/20 border border-purple-900/40 rounded-2xl text-center hover:scale-[1.03] transition-all flex flex-col items-center gap-2"
              >
                <FileText className="w-7 h-7 text-purple-400" />
                <span className="text-xs font-black text-purple-300">Manual Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Manual Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl relative border border-white/5 animate-scale-in">
            <button onClick={() => setShowAddForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 z-10">
              <X className="w-4.5 h-4.5 text-slate-450" />
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl p-5 shadow-2xl relative border border-white/5 animate-scale-in">
            <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 z-10">
              <X className="w-4.5 h-4.5 text-slate-450" />
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
