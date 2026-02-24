import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Transaction, Budget, SavingsGoal, User, Debt } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  increment,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { format, subMonths, parseISO } from 'date-fns';

interface FinanceContextType {
  user: FirebaseUser | null;
  transactions: Transaction[];
  budgets: Budget[];
  savings: SavingsGoal[];
  debts: Debt[];
  loading: boolean;
  stats: any;
  chartData: any;
  categoryData: any;
  healthScore: number;
  streak: number;
  badges: string[];
  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveBudget: (budget: Omit<Budget, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'current_amount' | 'created_at'>) => Promise<void>;
  contributeToSavings: (id: string, amount: number) => Promise<void>;
  addDebt: (debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'settled'>) => Promise<void>;
  toggleDebtSettled: (id: string, settled: boolean) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setTransactions([]);
        setBudgets([]);
        setSavings([]);
        setDebts([]);
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth State Error:", error);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const handleError = (error: any) => {
      console.error("Firestore Listener Error:", error);
      if (error.code === 'permission-denied') {
        console.warn("Permission denied. Check your Firestore security rules.");
      }
      setLoading(false);
    };

    // Real-time listeners for user data using nested paths
    const unsubTxs = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Transaction));
      setTransactions(txs);
    }, handleError);

    const unsubBudgets = onSnapshot(collection(db, 'users', user.uid, 'budgets'), (snapshot) => {
      const bgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Budget));
      setBudgets(bgs);
    }, handleError);

    const unsubSavings = onSnapshot(collection(db, 'users', user.uid, 'savings'), (snapshot) => {
      const svg = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as SavingsGoal));
      setSavings(svg);
    }, handleError);

    const unsubDebts = onSnapshot(collection(db, 'users', user.uid, 'debts'), (snapshot) => {
      const dbts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Debt));
      setDebts(dbts);
      setLoading(false);
    }, handleError);

    return () => {
      unsubTxs();
      unsubBudgets();
      unsubSavings();
      unsubDebts();
    };
  }, [user]);

  // Actions
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      ...tx,
      user_id: user.uid,
      created_at: new Date().toISOString()
    });
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
  };

  const saveBudget = async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'budgets'), 
      where('month', '==', budget.month)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const budgetId = snapshot.docs[0].id;
      await updateDoc(doc(db, 'users', user.uid, 'budgets', budgetId), { amount: budget.amount });
    } else {
      await addDoc(collection(db, 'users', user.uid, 'budgets'), {
        ...budget,
        user_id: user.uid,
        created_at: new Date().toISOString()
      });
    }
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'current_amount' | 'created_at'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'savings'), {
      ...goal,
      user_id: user.uid,
      current_amount: 0,
      created_at: new Date().toISOString()
    });
  };

  const contributeToSavings = async (id: string, amount: number) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'savings', id), {
      current_amount: increment(amount)
    });
  };

  const addDebt = async (debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'settled'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'debts'), {
      ...debt,
      user_id: user.uid,
      settled: false,
      created_at: new Date().toISOString()
    });
  };

  const toggleDebtSettled = async (id: string, settled: boolean) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'debts', id), {
      settled
    });
  };

  const deleteDebt = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'debts', id));
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
      debts,
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
      contributeToSavings,
      addDebt,
      toggleDebtSettled,
      deleteDebt
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
