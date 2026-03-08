import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Transaction, Project, Component, User } from './types';
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
  where,
  setDoc
} from 'firebase/firestore';
import { format, subMonths, parseISO, differenceInDays } from 'date-fns';

interface ProjectContextType {
  user: FirebaseUser | null;
  projects: Project[];
  transactions: Transaction[];
  loading: boolean;
  stats: any;
  // Actions
  addProject: (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'totalPaid'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addComponent: (projectId: string, component: Omit<Component, 'id' | 'projectId' | 'created_at'>) => Promise<void>;
  updateComponent: (projectId: string, componentId: string, updates: Partial<Component>) => Promise<void>;
  deleteComponent: (projectId: string, componentId: string) => Promise<void>;
  getComponents: (projectId: string) => Promise<Component[]>;
  subscribeToComponents: (projectId: string, callback: (components: Component[]) => void) => () => void;
  addPayment: (projectId: string, amount: number, notes?: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProjects([]);
        setTransactions([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubProjects = onSnapshot(collection(db, 'users', user.uid, 'projects'), (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projs);
    });

    const unsubTxs = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
    });

    return () => {
      unsubProjects();
      unsubTxs();
    };
  }, [user]);

  const addProject = async (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'totalPaid'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'projects'), {
      ...project,
      user_id: user.uid,
      totalPaid: 0,
      created_at: new Date().toISOString()
    });
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'projects', id), updates);
  };

  const deleteProject = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'projects', id));
  };

  const addComponent = async (projectId: string, component: Omit<Component, 'id' | 'projectId' | 'created_at'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'projects', projectId, 'components'), {
      ...component,
      projectId,
      created_at: new Date().toISOString()
    });
  };

  const updateComponent = async (projectId: string, componentId: string, updates: Partial<Component>) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'projects', projectId, 'components', componentId), updates);
  };

  const deleteComponent = async (projectId: string, componentId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'projects', projectId, 'components', componentId));
  };

  const getComponents = async (projectId: string) => {
    if (!user) return [];
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'projects', projectId, 'components'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Component));
  };

  const subscribeToComponents = (projectId: string, callback: (components: Component[]) => void) => {
    if (!user) return () => {};
    return onSnapshot(collection(db, 'users', user.uid, 'projects', projectId, 'components'), (snapshot) => {
      const components = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Component));
      callback(components);
    });
  };

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

  const addPayment = async (projectId: string, amount: number, notes?: string) => {
    if (!user) return;
    // 1. Add transaction
    await addTransaction({
      type: 'income',
      amount,
      category: 'Project Payment',
      date: new Date().toISOString().split('T')[0],
      linkedProjectId: projectId,
      notes: notes || `Payment for project ${projectId}`
    });
    // 2. Update project totalPaid
    await updateDoc(doc(db, 'users', user.uid, 'projects', projectId), {
      totalPaid: increment(amount)
    });
  };

  const stats = useMemo(() => {
    const totalRevenue = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    const pendingDues = projects.reduce((acc, p) => {
      const totalFee = p.developmentFee || 0;
      return acc + (totalFee - p.totalPaid);
    }, 0);
    
    const totalPotentialRevenue = projects.reduce((acc, p) => acc + (p.developmentFee || 0), 0);
    
    return {
      totalRevenue,
      totalExpenses,
      pendingDues,
      balance: totalRevenue - totalExpenses,
      estimatedTotalProfit: totalPotentialRevenue - totalExpenses,
      activeProjects: projects.filter(p => p.status !== 'Completed').length,
      completedProjects: projects.filter(p => p.status === 'Completed').length
    };
  }, [projects, transactions]);

  return (
    <ProjectContext.Provider value={{ 
      user, 
      projects, 
      transactions, 
      loading, 
      stats,
      addProject,
      updateProject,
      deleteProject,
      addComponent,
      updateComponent,
      deleteComponent,
      getComponents,
      subscribeToComponents,
      addPayment,
      addTransaction,
      deleteTransaction
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
