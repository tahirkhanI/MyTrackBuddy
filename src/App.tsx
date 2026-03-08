import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Target, 
  PieChart as PieChartIcon, 
  LogOut, 
  Plus, 
  Trash2, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Download, 
  Search,
  ChevronRight,
  Wallet,
  TrendingUp,
  AlertCircle,
  X,
  Menu,
  ChevronLeft,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Flame,
  Activity,
  Zap,
  Star,
  HandCoins,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths, getYear, getMonth, isSameMonth } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { Transaction, Budget, SavingsGoal, User } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProjectProvider, useProject } from './ProjectContext';
import { Card, ProgressRing } from './components/UI';
import { ProjectBoard } from './components/ProjectBoard';
import { ProjectDetails } from './components/ProjectDetails';
import { ProjectForm } from './components/ProjectForm';
import { Project, Component } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Validation Schemas ---
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.string(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  linkedProjectId: z.string().optional(),
});

const budgetSchema = z.object({
  amount: z.number().positive(),
  month: z.string(),
});

const savingsSchema = z.object({
  name: z.string().min(1),
  target_amount: z.number().positive(),
  deadline: z.string().optional(),
});

// --- Main App Component ---

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}

function AppContent() {
  const { 
    user, 
    loading, 
    stats, 
    projects,
    transactions, 
    addProject,
    addTransaction,
    addPayment,
    deleteTransaction
  } = useProject();
  const [view, setView] = useState<'dashboard' | 'projects' | 'transactions'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'transaction' | 'project' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Filters for transactions
  const [txFilters, setTxFilters] = useState({
    month: '',
    year: '',
    category: '',
    type: '',
    sort: 'date-desc'
  });

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [view]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleLogin = async (data: any) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
    } catch (error: any) {
      console.error('Login Error:', error.code, error.message);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized in Firebase. Please add this URL to "Authorized domains" in your Firebase Console.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError(`Authentication error: ${error.message}`);
      }
    }
  };

  const handleRegister = async (data: any) => {
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(userCredential.user, { displayName: data.name });
    } catch (error: any) {
      console.error('Registration Error:', error.code, error.message);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized in Firebase. Please add this URL to "Authorized domains" in your Firebase Console.');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists. Please log in.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Password is too weak. Please use at least 6 characters.');
      } else {
        setAuthError(`Registration error: ${error.message}`);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google Login Error:', error.code, error.message);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized for Google Sign-In. Please add this URL to "Authorized domains" in your Firebase Console.');
      } else if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError(`Google Sign-In failed: ${error.message}`);
      }
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(20);
    doc.text('EduFinance Summary Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 30);
    doc.text(`User: ${user?.displayName || user?.email}`, 14, 38);

    doc.autoTable({
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Income (Current Month)', `$${stats.income.toLocaleString()}`],
        ['Total Expenses (Current Month)', `$${stats.expenses.toLocaleString()}`],
        ['Net Balance', `$${stats.balance.toLocaleString()}`],
        ['Budget Status', `${stats.currentBudget ? Math.round((stats.expenses / stats.currentBudget) * 100) : 0}% spent`],
      ],
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Date', 'Type', 'Category', 'Amount']],
      body: transactions.slice(0, 20).map(t => [t.date, t.type, t.category, `$${t.amount}`]),
    });

    doc.save(`finance_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md p-8" animate>
        <div className="flex justify-center mb-8">
          <div className="bg-zinc-900 p-3 rounded-2xl shadow-xl shadow-zinc-900/20">
            <Wallet className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">
          {isAuthMode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-zinc-500 text-center mb-8">
          {isAuthMode === 'login' ? 'Manage your student finances with ease.' : 'Start your journey to financial freedom.'}
        </p>

        <AuthForm 
          mode={isAuthMode} 
          onSubmit={isAuthMode === 'login' ? handleLogin : handleRegister} 
          onGoogleLogin={handleGoogleLogin}
          error={authError}
        />

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login');
              setAuthError(null);
            }}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            {isAuthMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </Card>
    </div>
  );

  const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-zinc-200 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-zinc-600 hover:bg-zinc-50 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="bg-zinc-900 p-1.5 rounded-lg">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">EduFinance</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-xs">
            {user.displayName?.[0] || user.email?.[0]}
          </div>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-white border-r border-zinc-200 flex flex-col z-50 transition-all duration-300 lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0",
        isSidebarCollapsed ? "lg:w-20" : "lg:w-64"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className={cn("flex items-center gap-3 transition-opacity", isSidebarCollapsed && "lg:opacity-0")}>
            <div className="bg-zinc-900 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">EduFinance</span>
          </div>
          <button 
            onClick={() => isSidebarOpen ? setIsSidebarOpen(false) : setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5 hidden lg:block" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem 
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')} 
            icon={LayoutDashboard} 
            label="Dashboard" 
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={view === 'projects'} 
            onClick={() => setView('projects')} 
            icon={Target} 
            label="Project Board" 
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={view === 'transactions'} 
            onClick={() => setView('transactions')} 
            icon={Receipt} 
            label="Finance Ledger" 
            collapsed={isSidebarCollapsed}
          />
        </nav>

        <div className="p-4 border-t border-zinc-200">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 mb-4">
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 shrink-0">
                {user.displayName?.[0] || user.email?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors min-h-[44px]",
              isSidebarCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isSidebarCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
        {/* Desktop Header */}
        <header className="hidden lg:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </h1>
            <p className="text-zinc-500">Welcome back, {(user.displayName || user.email || '').split(' ')[0]}!</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalType('project')} className="btn-primary flex items-center gap-2 min-h-[44px]">
              <Plus className="w-4 h-4" />
              New Project
            </button>
            <button onClick={() => setModalType('transaction')} className="btn-secondary flex items-center gap-2 min-h-[44px]">
              <Plus className="w-4 h-4" />
              Log Expense
            </button>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <Card className="p-8 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white border-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium backdrop-blur-md">
                    Freelance ERP Dashboard
                  </span>
                </div>
                <h2 className="text-xl text-zinc-400 mb-1">Hardware Developer Console</h2>
                <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-12">
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Total Revenue</p>
                    <h3 className="text-5xl font-bold tracking-tight">
                      ₹{stats.totalRevenue.toLocaleString()}
                    </h3>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider font-bold">Active Projects</p>
                      <p className="text-xl font-bold text-emerald-400">{stats.activeProjects}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider font-bold">Completed</p>
                      <p className="text-xl font-bold text-indigo-400">{stats.completedProjects}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard 
                title="Total Revenue" 
                value={`₹${stats.totalRevenue.toLocaleString()}`} 
                icon={TrendingUp} 
                color="bg-emerald-50 text-emerald-600"
                message="Total earnings from all projects"
              />
              <StatCard 
                title="Pending Dues" 
                value={`₹${stats.pendingDues.toLocaleString()}`} 
                icon={AlertCircle} 
                color="bg-amber-50 text-amber-600"
                message="Fees yet to be collected"
              />
              <StatCard 
                title="Component Expenses" 
                value={`₹${stats.totalExpenses.toLocaleString()}`} 
                icon={ArrowDownCircle} 
                color="bg-rose-50 text-rose-600"
                message="Hardware & component costs"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-0">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="text-lg font-bold">Recent Transactions</h3>
                  <button onClick={() => setView('transactions')} className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">View Ledger</button>
                </div>
                <div className="divide-y divide-zinc-100">
                  {transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2.5 rounded-2xl shrink-0", tx.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                          {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{tx.category}</p>
                          <p className="text-xs text-zinc-500">{format(parseISO(tx.date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <span className={cn("font-bold shrink-0 ml-2", tx.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                        {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-6">Quick Project Overview</h3>
                <div className="space-y-6">
                  {projects.slice(0, 4).map(project => {
                    const statusColor = project.status === 'Completed' ? 'bg-emerald-500' : project.status === 'In Progress' ? 'bg-indigo-500' : 'bg-amber-500';
                    return (
                      <div key={project.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 transition-colors cursor-pointer" onClick={() => { setSelectedProject(project); setView('projects'); }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{project.projectName}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">{project.studentName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">₹{project.developmentFee.toLocaleString()}</p>
                          <p className="text-[10px] text-zinc-400 font-bold">Fee</p>
                        </div>
                      </div>
                    );
                  })}
                  {projects.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-zinc-500 text-sm font-medium">No projects yet.</p>
                      <button onClick={() => setModalType('project')} className="text-zinc-900 text-sm font-bold mt-2 hover:underline">Create your first project</button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {view === 'projects' && (
          <div className="h-full">
            {selectedProject ? (
              <ProjectDetails 
                project={selectedProject} 
                onClose={() => setSelectedProject(null)} 
              />
            ) : (
              <ProjectBoard 
                projects={projects} 
                onProjectClick={(p) => setSelectedProject(p)} 
              />
            )}
          </div>
        )}

        {view === 'transactions' && (
          <TransactionsView 
            transactions={transactions} 
            filters={txFilters} 
            setFilters={setTxFilters} 
            onDelete={deleteTransaction}
            projects={projects}
            exportCSV={() => {
              const headers = ['Date', 'Type', 'Category', 'Amount', 'Method', 'Notes'];
              const rows = transactions.map(t => [t.date, t.type, t.category, t.amount, t.payment_method || '', t.notes || '']);
              const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
              link.click();
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-zinc-200 px-6 py-3 flex justify-between items-center z-40">
        <BottomNavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={LayoutDashboard} />
        <BottomNavItem active={view === 'projects'} onClick={() => setView('projects')} icon={Target} />
        <div className="relative -top-6">
          <button 
            onClick={() => setModalType('project')}
            className="bg-zinc-900 text-white p-4 rounded-2xl shadow-xl shadow-zinc-900/40 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
        <BottomNavItem active={view === 'transactions'} onClick={() => setView('transactions')} icon={Receipt} />
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalType(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg p-8 relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setModalType(null)}
                className="absolute right-6 top-6 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold mb-6">
                {modalType === 'transaction' ? 'Log Hardware Expense' : 'Create New Project'}
              </h3>
              
              {modalType === 'transaction' ? (
                <TransactionForm 
                  onSubmit={async (data: any) => {
                    await addTransaction(data);
                    setModalType(null);
                  }} 
                />
              ) : (
                <ProjectForm 
                  onSubmit={async (data: any) => {
                    await addProject(data);
                    setModalType(null);
                  }} 
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

const NavItem = ({ active, onClick, icon: Icon, label, collapsed }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
      active 
        ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20" 
        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
      collapsed && "justify-center px-0"
    )}
  >
    <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", active && "text-white")} />
    {!collapsed && <span>{label}</span>}
  </button>
);

const BottomNavItem = ({ active, onClick, icon: Icon }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "p-2 rounded-xl transition-colors",
      active ? "text-zinc-900" : "text-zinc-400"
    )}
  >
    <Icon className="w-6 h-6" />
  </button>
);

const StatCard = ({ title, value, icon: Icon, color, message }: any) => (
  <Card className="p-6 flex flex-col justify-between group">
    <div className="flex items-center gap-4 mb-4">
      <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-zinc-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
      </div>
    </div>
    {message && (
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
        {message}
      </p>
    )}
  </Card>
);

const TransactionsView = ({ transactions, filters, setFilters, onDelete, exportCSV, projects }: any) => {
  const filteredTxs = useMemo(() => {
    return transactions
      .filter((tx: any) => {
        if (filters.month && format(parseISO(tx.date), 'MM') !== filters.month) return false;
        if (filters.year && format(parseISO(tx.date), 'yyyy') !== filters.year) return false;
        if (filters.category && tx.category !== filters.category) return false;
        if (filters.type && tx.type !== filters.type) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        if (filters.sort === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (filters.sort === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (filters.sort === 'amount-desc') return b.amount - a.amount;
        if (filters.sort === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, filters]);

  const groupedTxs = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTxs.forEach((tx: any) => {
      const month = format(parseISO(tx.date), 'MMMM yyyy');
      if (!groups[month]) groups[month] = [];
      groups[month].push(tx);
    });
    return Object.entries(groups);
  }, [filteredTxs]);

  const categories = Array.from(new Set(transactions.map((t: any) => t.category)));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <select 
            value={filters.month} 
            onChange={e => setFilters({ ...filters, month: e.target.value })}
            className="input-field text-sm"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={format(new Date(2024, i, 1), 'MM')}>
                {format(new Date(2024, i, 1), 'MMMM')}
              </option>
            ))}
          </select>
          <select 
            value={filters.category} 
            onChange={e => setFilters({ ...filters, category: e.target.value })}
            className="input-field text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={filters.type} 
            onChange={e => setFilters({ ...filters, type: e.target.value })}
            className="input-field text-sm"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select 
            value={filters.sort} 
            onChange={e => setFilters({ ...filters, sort: e.target.value })}
            className="input-field text-sm"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
          <button onClick={exportCSV} className="btn-secondary flex items-center justify-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </Card>

      <div className="space-y-8">
        {groupedTxs.map(([month, txs]) => (
          <div key={month} className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest px-2">{month}</h3>
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100 text-zinc-500 text-[10px] uppercase font-bold tracking-wider sticky top-0">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {txs.map(tx => {
                      const linkedProject = projects.find((p: any) => p.id === tx.linkedProjectId);
                      return (
                        <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors group">
                          <td className="px-6 py-4 text-xs font-medium text-zinc-500">{format(parseISO(tx.date), 'MMM d')}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-zinc-900">{tx.category}</span>
                            {tx.notes && <p className="text-[10px] text-zinc-400 font-medium">{tx.notes}</p>}
                          </td>
                          <td className="px-6 py-4">
                            {linkedProject ? (
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                {linkedProject.projectName}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-400">General</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("text-sm font-bold", tx.type === 'income' ? "text-emerald-600" : "text-zinc-900")}>
                              {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => onDelete(tx.id)}
                              className="p-2 text-zinc-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

const AuthForm = ({ mode, onSubmit, onGoogleLogin, error }: any) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema | typeof registerSchema>>({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema)
  });

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Full Name</label>
            <input {...register('name' as any)} className="input-field h-12" placeholder="John Doe" />
            {(errors as any).name && <p className="text-rose-500 text-xs mt-1.5 font-medium">Name is required</p>}
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Email Address</label>
          <input {...register('email')} className="input-field h-12" placeholder="john@example.com" />
          {errors.email && <p className="text-rose-500 text-xs mt-1.5 font-medium">Valid email is required</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Password</label>
          <input {...register('password')} type="password" className="input-field h-12" placeholder="••••••••" />
          {errors.password && <p className="text-rose-500 text-xs mt-1.5 font-medium">Password must be at least 6 chars</p>}
        </div>
        <button disabled={isSubmitting} className="btn-primary w-full mt-2 py-4 text-sm font-bold shadow-xl shadow-zinc-900/20">
          {isSubmitting ? 'Processing...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-zinc-400 font-bold tracking-wider">Or continue with</span>
        </div>
      </div>

      <button 
        type="button"
        onClick={onGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors font-bold text-sm"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>
    </div>
  );
};

const TransactionForm = ({ onSubmit }: any) => {
  const { projects } = useProject();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'expense'
    }
  });

  const type = watch('type');
  const category = watch('category');
  const paymentMethod = watch('payment_method');

  const incomeCategories = ['Project Advance', 'Final Payment', 'Partial Payment', 'Other'];
  const expenseCategories = ['Hardware Component', 'Tools', 'Shipping', 'Service Subscription', 'Other'];
  const paymentMethods = ['Cash', 'UPI', 'Bank Transfer', 'Credit/Debit Card', 'Other'];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Type</label>
          <select {...register('type')} className="input-field h-12">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Amount (₹)</label>
          <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" className="input-field h-12" placeholder="0.00" />
          {errors.amount && <p className="text-rose-500 text-xs mt-1.5 font-medium">Amount is required</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Linked Project (Optional)</label>
        <select {...register('linkedProjectId')} className="input-field h-12">
          <option value="">None / General</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.projectName} ({p.studentName})</option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Category</label>
          <select 
            className="input-field h-12"
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                setValue('category', e.target.value);
              } else {
                setValue('category', '');
              }
            }}
            value={type === 'income' ? (incomeCategories.includes(category) ? category : 'custom') : (expenseCategories.includes(category) ? category : 'custom')}
          >
            {(type === 'income' ? incomeCategories : expenseCategories).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="custom">Add Custom...</option>
          </select>
          {(type === 'income' ? !incomeCategories.includes(category) : !expenseCategories.includes(category)) && (
            <input 
              {...register('category')} 
              className="input-field h-12 mt-2" 
              placeholder="Enter custom category" 
              autoFocus
            />
          )}
          {errors.category && <p className="text-rose-500 text-xs mt-1.5 font-medium">Category is required</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Payment Method</label>
          <select 
            className="input-field h-12"
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                setValue('payment_method', e.target.value);
              } else {
                setValue('payment_method', '');
              }
            }}
            value={paymentMethods.includes(paymentMethod || '') ? paymentMethod : 'custom'}
          >
            {paymentMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
            <option value="custom">Add Custom...</option>
          </select>
          {!paymentMethods.includes(paymentMethod || '') && (
            <input 
              {...register('payment_method')} 
              className="input-field h-12 mt-2" 
              placeholder="Enter custom method" 
              autoFocus
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Date</label>
          <input {...register('date')} type="date" className="input-field h-12" />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Notes (Optional)</label>
          <input {...register('notes')} className="input-field h-12" placeholder="Add some details..." />
        </div>
      </div>
      
      <button disabled={isSubmitting} className="btn-primary w-full py-4 text-sm font-bold shadow-xl shadow-zinc-900/20">
        {isSubmitting ? 'Saving...' : 'Add Transaction'}
      </button>
    </form>
  );
};
