import { supabase } from '../lib/supabaseClient';

/**
 * Populates Supabase with complete realistic sandbox data for testing.
 */
export const populateDemoData = async (userId) => {
  if (!userId) throw new Error('User ID is required to populate demo data.');

  // 1. Create Mock Accounts
  const mockAccounts = [
    { name: 'Maybank Checking', type: 'Checking', current_balance: 12450.50, credit_limit: null },
    { name: 'CIMB Visa Platinum', type: 'Credit Card', current_balance: -1850.20, credit_limit: 15000 },
    { name: 'TnG eWallet', type: 'E-Wallet', current_balance: 350.00, credit_limit: null },
    { name: 'Cash', type: 'Cash', current_balance: 200.00, credit_limit: null }
  ];

  const createdAccounts = [];

  for (const acc of mockAccounts) {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        name: acc.name,
        type: acc.type,
        current_balance: acc.current_balance,
        credit_limit: acc.credit_limit
      })
      .select();

    if (error) throw error;
    if (data && data.length > 0) {
      createdAccounts.push(data[0]);
    }
  }

  // Find account IDs helper
  const getAccId = (name) => {
    const acc = createdAccounts.find(a => a.name === name);
    return acc ? acc.id : null;
  };

  const maybankId = getAccId('Maybank Checking');
  const cimbId = getAccId('CIMB Visa Platinum');
  const tngId = getAccId('TnG eWallet');
  const cashId = getAccId('Cash');

  // 2. Create Mock Budgets
  const mockBudgets = [
    { category: 'Eating Out', limit_amount: 800.00 },
    { category: 'Shopping', limit_amount: 1000.00 },
    { category: 'Fuel', limit_amount: 300.00 },
    { category: 'Entertainment', limit_amount: 400.00 }
  ];

  for (const b of mockBudgets) {
    await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        category: b.category,
        limit_amount: b.limit_amount
      });
  }

  // 3. Create Mock Savings Goals
  const mockGoals = [
    { name: 'Japan Trip ✈️', target_amount: 8000.00, current_amount: 3500.00, target_date: '2026-12-15' },
    { name: 'Emergency Fund 🛡️', target_amount: 15000.00, current_amount: 6000.00, target_date: '2027-06-30' }
  ];

  for (const g of mockGoals) {
    await supabase
      .from('goals')
      .insert({
        user_id: userId,
        name: g.name,
        target_amount: g.target_amount,
        current_amount: g.current_amount,
        target_date: g.target_date
      });
  }

  // 4. Create Mock Subscriptions
  const mockSubs = [
    { name: 'Spotify Premium', amount: 17.50, type: 'Subscription', account_id: tngId, billing_cycle: 'monthly', next_payment_date: '2026-07-08' },
    { name: 'Netflix Premium', amount: 55.00, type: 'Subscription', account_id: cimbId, billing_cycle: 'monthly', next_payment_date: '2026-07-15' },
    { name: 'House Loan', amount: 1800.00, type: 'Loan', account_id: maybankId, billing_cycle: 'monthly', next_payment_date: '2026-07-28' }
  ];

  for (const s of mockSubs) {
    await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        name: s.name,
        amount: s.amount,
        type: s.type,
        account_id: s.account_id,
        billing_cycle: s.billing_cycle,
        next_payment_date: s.next_payment_date
      });
  }

  // 5. Create Mock Transactions (spread over the current month)
  const today = new Date();
  const makeDateString = (dayOffset) => {
    const d = new Date();
    d.setDate(today.getDate() - dayOffset);
    return d.toISOString().split('T')[0];
  };

  const mockTxs = [
    { account_id: maybankId, type: 'income', amount: 6500.00, category: 'Salary', description: 'COMPANY PAYROLL', date: makeDateString(15) },
    { account_id: tngId, type: 'expense', amount: 75.00, category: 'Eating Out', description: 'DIN TAI FUNG', date: makeDateString(0) },
    { account_id: tngId, type: 'expense', amount: 15.50, category: 'Eating Out', description: 'STARBUCKS COFFEE', date: makeDateString(1) },
    { account_id: cimbId, type: 'expense', amount: 320.00, category: 'Shopping', description: 'UNIQLO MIDVALLEY', date: makeDateString(2) },
    { account_id: cimbId, type: 'expense', amount: 450.00, category: 'Shopping', description: 'LAZADA ONLINE STORE', date: makeDateString(3) },
    { account_id: maybankId, type: 'expense', amount: 80.00, category: 'Fuel', description: 'PETRONAS KLCC', date: makeDateString(5) },
    { account_id: cashId, type: 'expense', amount: 12.00, category: 'Eating Out', description: 'HAWKER STALL LUNCH', date: makeDateString(6) },
    { account_id: tngId, type: 'expense', amount: 15.00, category: 'Public Transport', description: 'RAPIDKL LRT TOUCH', date: makeDateString(8) },
    { account_id: cimbId, type: 'expense', amount: 45.00, category: 'Entertainment', description: 'GSC CINEMAS', date: makeDateString(10) },
    { account_id: maybankId, type: 'expense', amount: 1800.00, category: 'Other Expense', description: 'HOUSE LOAN REPAYMENT', date: makeDateString(12) }
  ];

  for (const t of mockTxs) {
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: t.account_id,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        transaction_date: t.date
      });
  }

  return true;
};
