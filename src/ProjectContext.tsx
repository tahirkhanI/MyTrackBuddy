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
  addPayment: (projectId: string, amount: number, date: string, notes?: string) => Promise<void>;
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

    const unsubProjects = onSnapshot(collection(db, 'users', user.uid, 'projects'), 
      (snapshot) => {
        const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(projs);
      },
      (error) => {
        console.error("Projects listener error:", error);
        if (error.code === 'permission-denied') {
          console.warn("Permission denied for projects. Check Firestore rules.");
        }
      }
    );

    const unsubTxs = onSnapshot(collection(db, 'users', user.uid, 'transactions'), 
      (snapshot) => {
        const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(txs);
        setLoading(false);
      },
      (error) => {
        console.error("Transactions listener error:", error);
        setLoading(false);
      }
    );

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
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newComponent: Component = {
      ...component,
      id: Math.random().toString(36).substr(2, 9),
      projectId,
      created_at: new Date().toISOString()
    };

    const updatedComponents = [...(project.components || []), newComponent];
    await updateDoc(doc(db, 'users', user.uid, 'projects', projectId), {
      components: updatedComponents
    });
  };

  const updateComponent = async (projectId: string, componentId: string, updates: Partial<Component>) => {
    if (!user) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedComponents = (project.components || []).map(c => 
      c.id === componentId ? { ...c, ...updates } : c
    );

    await updateDoc(doc(db, 'users', user.uid, 'projects', projectId), {
      components: updatedComponents
    });
  };

  const deleteComponent = async (projectId: string, componentId: string) => {
    if (!user) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedComponents = (project.components || []).filter(c => c.id !== componentId);

    await updateDoc(doc(db, 'users', user.uid, 'projects', projectId), {
      components: updatedComponents
    });
  };

  const getComponents = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.components || [];
  };

  const subscribeToComponents = (projectId: string, callback: (components: Component[]) => void) => {
    // Since components are now part of the project document, 
    // we can just use the project state which is already being updated by the main projects listener.
    const project = projects.find(p => p.id === projectId);
    if (project) {
      callback(project.components || []);
    }
    
    // Return a dummy unsubscribe function
    return () => {};
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

  const addPayment = async (projectId: string, amount: number, date: string, notes?: string) => {
    if (!user) return;
    // 1. Add transaction
    await addTransaction({
      type: 'income',
      amount,
      category: 'Project Payment',
      date,
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
    
    // Total Project Value (Sum of all development fees)
    const totalProjectValue = projects.reduce((acc, p) => acc + (p.developmentFee || 0), 0);
    
    // Calculate total component costs per project to get true profit
    const totalComponentCosts = projects.reduce((acc, p) => {
      const projectComponentCosts = (p.components || []).reduce((sum, c) => sum + (c.actualCost || c.estimatedCost || 0), 0);
      return acc + projectComponentCosts;
    }, 0);

    // Total Potential Profit = Total Project Value - Total Component Costs
    const totalPotentialProfit = totalProjectValue - totalComponentCosts;
    
    return {
      totalRevenue, // Actual money received
      totalExpenses, // Actual money spent (from transactions)
      totalProjectValue, // Total value of all contracts
      totalComponentCosts,
      pendingDues,
      balance: totalRevenue - totalExpenses,
      estimatedTotalProfit: totalPotentialProfit,
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
