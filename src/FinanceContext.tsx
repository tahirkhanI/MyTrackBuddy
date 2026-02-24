import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Transaction, Budget, SavingsGoal, User } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  updateDoc,
  increment,
  getDocs
} from 'firebase/firestore';
import { format, subMonths, parseISO } from 'date-fns';

interface FinanceContextType {
  user: FirebaseUser | null;
  transactions: Transaction[];
  budgets: Budget[];
  savings: SavingsGoal[];
  loading: boolean;
  stats: any;
  chartData: any;
  categoryData: any;
  healthScore: number;
  streak: number;
  badges: string[];
  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'user_id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveBudget: (budget: Omit<Budget, 'id' | 'user_id'>) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'current_amount'>) => Promise<void>;
  contributeToSavings: (id: string, amount: number) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setTransactions([]);
        setBudgets([]);
        setSavings([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Real-time listeners for user data
    const qTxs = query(collection(db, 'transactions'), where('user_id', '==', user.uid));
    const unsubTxs = onSnapshot(qTxs, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Transaction));
      setTransactions(txs);
    });

    const qBudgets = query(collection(db, 'budgets'), where('user_id', '==', user.uid));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const bgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Budget));
      setBudgets(bgs);
    });

    const qSavings = query(collection(db, 'savings'), where('user_id', '==', user.uid));
    const unsubSavings = onSnapshot(qSavings, (snapshot) => {
      const svg = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as SavingsGoal));
      setSavings(svg);
      setLoading(false);
    });

    return () => {
      unsubTxs();
      unsubBudgets();
      unsubSavings();
    };
  }, [user]);

  // Actions
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'user_id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'transactions'), {
      ...tx,
      user_id: user.uid,
      created_at: new Date().toISOString()
    });
  };

  const deleteTransaction = async (id: string) => {
    await deleteDoc(doc(db, 'transactions', id));
  };

  const saveBudget = async (budget: Omit<Budget, 'id' | 'user_id'>) => {
    if (!user) return;
    // Check if budget for this month exists
    const q = query(
      collection(db, 'budgets'), 
      where('user_id', '==', user.uid), 
      where('month', '==', budget.month)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const budgetId = snapshot.docs[0].id;
      await updateDoc(doc(db, 'budgets', budgetId), { amount: budget.amount });
    } else {
      await addDoc(collection(db, 'budgets'), {
        ...budget,
        user_id: user.uid
      });
    }
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'current_amount'>) => {
    if (!user) return;
    await addDoc(collection(db, 'savings'), {
      ...goal,
      user_id: user.uid,
      current_amount: 0
    });
  };

  const contributeToSavings = async (id: string, amount: number) => {
    await updateDoc(doc(db, 'savings', id), {
      current_amount: increment(amount)
    });
  };

  // Stats calculation (same as before)
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
    let score = 50;
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
    let currentStreak = 0;
    for (let i = 0; i < 12; i++) {
      const m = format(subMonths(new Date(), i), 'yyyy-MM');
      const monthTxs = transactions.filter(t => t.date.startsWith(m));
      const inc = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const exp = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      if (inc > exp && inc > 0) {
        currentStreak++;
      } else if (i === 0) {
        continue;
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
      stats, 
      chartData, 
      categoryData,
      healthScore,
      streak,
      badges,
      addTransaction,
      deleteTransaction,
      saveBudget,
      addSavingsGoal,
      contributeToSavings
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
