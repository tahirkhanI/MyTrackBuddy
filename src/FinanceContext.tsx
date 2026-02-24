import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Transaction, Budget, SavingsGoal, User } from './types';
import { api } from './api';
import { format, subMonths, parseISO, isSameMonth } from 'date-fns';

interface FinanceContextType {
  user: User | null;
  transactions: Transaction[];
  budgets: Budget[];
  savings: SavingsGoal[];
  loading: boolean;
  refreshData: () => Promise<void>;
  stats: any;
  chartData: any;
  categoryData: any;
  healthScore: number;
  streak: number;
  badges: string[];
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode, token: string | null }> = ({ children, token }) => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    if (!token) return;
    try {
      const [me, txs, bgs, svg] = await Promise.all([
        api.auth.me(),
        api.transactions.list(),
        api.budgets.list(),
        api.savings.list()
      ]);
      setUser(me.user);
      setTransactions(txs);
      setBudgets(bgs);
      setSavings(svg);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');

    const monthlyTxs = transactions.filter(t => t.date.startsWith(currentMonth));
    const lastMonthTxs = transactions.filter(t => t.date.startsWith(lastMonth));

    const income = monthlyTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = monthlyTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    const lastIncome = lastMonthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const lastExpenses = lastMonthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    const incomeTrend = lastIncome ? Math.round(((income - lastIncome) / lastIncome) * 100) : 0;
    const expenseTrend = lastExpenses ? Math.round(((expenses - lastExpenses) / lastExpenses) * 100) : 0;

    const currentBudget = budgets.find(b => b.month === currentMonth)?.amount || 0;
    
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

    // Most expensive category
    const cats: Record<string, number> = {};
    monthlyTxs.filter(t => t.type === 'expense').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    const topCategory = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    return { 
      income, 
      expenses, 
      balance: income - expenses, 
      incomeTrend, 
      expenseTrend, 
      currentBudget,
      savingsRate,
      topCategory
    };
  }, [transactions, budgets]);

  const healthScore = useMemo(() => {
    let score = 50; // Base score
    if (stats.currentBudget > 0) {
      const budgetUsage = stats.expenses / stats.currentBudget;
      if (budgetUsage <= 1) score += 20;
      if (budgetUsage <= 0.8) score += 10;
    }
    if (stats.savingsRate > 20) score += 10;
    if (stats.savingsRate > 40) score += 10;
    return Math.min(100, score);
  }, [stats]);

  const streak = useMemo(() => {
    // Simple streak calculation: months with positive balance
    let currentStreak = 0;
    for (let i = 0; i < 12; i++) {
      const m = format(subMonths(new Date(), i), 'yyyy-MM');
      const monthTxs = transactions.filter(t => t.date.startsWith(m));
      const inc = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const exp = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      if (inc > exp && inc > 0) {
        currentStreak++;
      } else if (i === 0) {
        continue; // Current month might not be finished
      } else {
        break;
      }
    }
    return currentStreak;
  }, [transactions]);

  const badges = useMemo(() => {
    const b = [];
    if (streak >= 3) b.push('Consistent Tracker');
    if (stats.savingsRate >= 30) b.push('Saver Level 1');
    if (stats.currentBudget > 0 && stats.expenses <= stats.currentBudget) b.push('Budget Master');
    return b;
  }, [streak, stats]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'yyyy-MM'));
    return months.map(m => {
      const monthTxs = transactions.filter(t => t.date.startsWith(m));
      return {
        name: format(parseISO(m + '-01'), 'MMM'),
        income: monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
        expense: monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
      };
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const expenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));
    const cats: Record<string, number> = {};
    expenses.forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <FinanceContext.Provider value={{ 
      user, 
      transactions, 
      budgets, 
      savings, 
      loading, 
      refreshData, 
      stats, 
      chartData, 
      categoryData,
      healthScore,
      streak,
      badges
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
