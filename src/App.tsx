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
  Star
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
import { api } from './api';
import { Transaction, Budget, SavingsGoal, User } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FinanceProvider, useFinance } from './FinanceContext';
import { Card, ProgressRing } from './components/UI';

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
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  return (
    <FinanceProvider token={token}>
      <AppContent token={token} setToken={setToken} />
    </FinanceProvider>
  );
}

function AppContent({ token, setToken }: { token: string | null, setToken: (t: string | null) => void }) {
  const { user, loading, stats, chartData, categoryData, transactions, budgets, savings, healthScore, streak, badges, refreshData } = useFinance();
  const [view, setView] = useState<'dashboard' | 'transactions' | 'budgets' | 'savings'>('dashboard');
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [showAddModal, setShowAddModal] = useState(false);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const handleLogin = async (data: any) => {
    const res = await api.auth.login(data);
    localStorage.setItem('token', res.token);
    setToken(res.token);
  };

  const handleRegister = async (data: any) => {
    const res = await api.auth.register(data);
    localStorage.setItem('token', res.token);
    setToken(res.token);
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(20);
    doc.text('EduFinance Summary Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 30);
    doc.text(`User: ${user?.name}`, 14, 38);

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
        />

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login')}
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
            {user.name[0]}
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
            active={view === 'transactions'} 
            onClick={() => setView('transactions')} 
            icon={Receipt} 
            label="Transactions" 
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={view === 'budgets'} 
            onClick={() => setView('budgets')} 
            icon={PieChartIcon} 
            label="Budgets" 
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            active={view === 'savings'} 
            onClick={() => setView('savings')} 
            icon={Target} 
            label="Savings Goals" 
            collapsed={isSidebarCollapsed}
          />
        </nav>

        <div className="p-4 border-t border-zinc-200">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 mb-4">
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 shrink-0">
                {user.name[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.name}</p>
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
            <p className="text-zinc-500">Welcome back, {user.name.split(' ')[0]}!</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportPDF} className="btn-secondary flex items-center gap-2 min-h-[44px]">
              <Download className="w-4 h-4" />
              PDF Report
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 min-h-[44px]">
              <Plus className="w-4 h-4" />
              Add Transaction
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
                    {format(new Date(), 'MMMM yyyy')}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                    <Flame className="w-3 h-3" />
                    {streak} Month Streak
                  </div>
                </div>
                <h2 className="text-xl text-zinc-400 mb-1">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0]} 👋</h2>
                <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-12">
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Total Balance</p>
                    <h3 className="text-5xl font-bold tracking-tight">
                      ${stats.balance.toLocaleString()}
                    </h3>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider font-bold">Monthly Income</p>
                      <p className="text-xl font-bold text-emerald-400">+${stats.income.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider font-bold">Monthly Expenses</p>
                      <p className="text-xl font-bold text-rose-400">-${stats.expenses.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex flex-wrap gap-3">
                  {badges.map(badge => (
                    <div key={badge} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-xs font-bold">
                      <Star className="w-3 h-3 text-amber-400" />
                      {badge}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Savings Rate" 
                value={`${stats.savingsRate}%`} 
                icon={Activity} 
                color="bg-indigo-50 text-indigo-600"
                message={stats.savingsRate > 20 ? "You're saving like a pro! 🚀" : "Try to save 20% of your income."}
              />
              <StatCard 
                title="Top Spending" 
                value={stats.topCategory} 
                icon={Zap} 
                color="bg-amber-50 text-amber-600"
                message={stats.topCategory !== 'None' ? `Careful — ${stats.topCategory} expenses are rising.` : "No expenses yet!"}
              />
              <StatCard 
                title="Health Score" 
                value={healthScore} 
                icon={Trophy} 
                color="bg-emerald-50 text-emerald-600"
                message={healthScore > 80 ? "Excellent financial health!" : "Keep tracking to improve your score."}
              />
              <Card className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 font-medium">Budget Usage</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {stats.currentBudget ? Math.round((stats.expenses / stats.currentBudget) * 100) : 0}%
                  </h3>
                </div>
                <ProgressRing 
                  progress={stats.currentBudget ? Math.round((stats.expenses / stats.currentBudget) * 100) : 0} 
                  size={60} 
                  strokeWidth={6}
                  color={stats.expenses > stats.currentBudget ? "stroke-rose-500" : "stroke-zinc-900"}
                />
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 p-6">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-bold">Financial Overview</h3>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" /> Income
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <div className="w-3 h-3 rounded-full bg-rose-500" /> Expense
                    </div>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      />
                      <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-8">Expense Breakdown</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                  {categoryData.slice(0, 4).map((cat, i) => (
                    <div key={cat.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-sm text-zinc-600 font-medium">{cat.name}</span>
                      </div>
                      <span className="text-sm font-bold">${cat.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-0">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="text-lg font-bold">Recent Activity</h3>
                  <button onClick={() => setView('transactions')} className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">View All</button>
                </div>
                <div className="divide-y divide-zinc-100">
                  {transactions.slice(0, 4).map(tx => (
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
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-6">Savings Progress</h3>
                <div className="space-y-6">
                  {savings.slice(0, 3).map(goal => {
                    const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between mb-3">
                          <div>
                            <span className="text-sm font-bold block">{goal.name}</span>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Target: ${goal.target_amount.toLocaleString()}</span>
                          </div>
                          <span className="text-sm font-bold text-zinc-900">{progress}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="bg-zinc-900 h-full rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {savings.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-zinc-300" />
                      </div>
                      <p className="text-zinc-500 text-sm font-medium">No savings goals set yet.</p>
                      <button onClick={() => setView('savings')} className="text-zinc-900 text-sm font-bold mt-2 hover:underline">Create your first goal</button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {view === 'transactions' && (
          <TransactionsView 
            transactions={transactions} 
            filters={txFilters} 
            setFilters={setTxFilters} 
            onDelete={async (id) => {
              await api.transactions.delete(id);
              refreshData();
            }}
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

        {view === 'budgets' && (
          <div className="space-y-8">
            <Card className="p-8 max-w-2xl">
              <h3 className="text-xl font-bold mb-6">Set Monthly Budget</h3>
              <BudgetForm 
                currentMonth={format(new Date(), 'yyyy-MM')}
                onSave={async (data) => {
                  await api.budgets.save(data);
                  refreshData();
                }} 
              />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {budgets.map(budget => {
                const monthTxs = transactions.filter(t => t.type === 'expense' && t.date.startsWith(budget.month));
                const spent = monthTxs.reduce((acc, t) => acc + t.amount, 0);
                const percent = Math.round((spent / budget.amount) * 100);
                
                return (
                  <Card key={budget.id} className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold text-lg">{format(parseISO(budget.month + '-01'), 'MMMM yyyy')}</h4>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        percent > 100 ? "bg-rose-100 text-rose-700" : percent > 75 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {percent}% Spent
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-zinc-500">Spent: ${spent.toLocaleString()}</span>
                        <span className="text-zinc-900">Limit: ${budget.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, percent)}%` }}
                          className={cn(
                            "h-full rounded-full",
                            percent > 100 ? "bg-rose-500" : percent > 75 ? "bg-amber-500" : "bg-zinc-900"
                          )}
                        />
                      </div>
                      {percent > 90 && (
                        <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl">
                          <AlertCircle className="w-4 h-4" />
                          Warning: You have exceeded 90% of your budget!
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {view === 'savings' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <button 
                onClick={() => setShowAddModal(true)}
                className="card p-6 border-dashed border-2 border-zinc-200 flex flex-col items-center justify-center text-center hover:bg-zinc-50 transition-all cursor-pointer min-h-[200px] group"
              >
                <div className="bg-zinc-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8 text-zinc-400" />
                </div>
                <h4 className="font-bold">New Goal</h4>
                <p className="text-sm text-zinc-500">Start saving for your future</p>
              </button>

              {savings.map(goal => {
                const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
                return (
                  <Card key={goal.id} className="p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="font-bold text-lg">{goal.name}</h4>
                        <p className="text-xs text-zinc-500 font-medium">Deadline: {goal.deadline ? format(parseISO(goal.deadline), 'MMM d, yyyy') : 'No deadline'}</p>
                      </div>
                      <div className="bg-zinc-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        {progress}%
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-lg">${goal.current_amount.toLocaleString()}</span>
                        <span className="text-zinc-400 font-medium">of ${goal.target_amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="bg-zinc-900 h-full rounded-full"
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-100 flex gap-2">
                      <button 
                        onClick={async () => {
                          const amount = parseFloat(prompt('How much would you like to contribute?') || '0');
                          if (amount > 0) {
                            await api.savings.contribute(goal.id, amount);
                            refreshData();
                          }
                        }}
                        className="btn-primary flex-1 text-xs py-3"
                      >
                        Contribute
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-zinc-200 px-6 py-3 flex justify-between items-center z-40">
        <BottomNavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={LayoutDashboard} />
        <BottomNavItem active={view === 'transactions'} onClick={() => setView('transactions')} icon={Receipt} />
        <div className="relative -top-6">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-zinc-900 text-white p-4 rounded-2xl shadow-xl shadow-zinc-900/40 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
        <BottomNavItem active={view === 'budgets'} onClick={() => setView('budgets')} icon={PieChartIcon} />
        <BottomNavItem active={view === 'savings'} onClick={() => setView('savings')} icon={Target} />
      </nav>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg p-8 relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute right-6 top-6 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold mb-6">Add New Transaction</h3>
              <TransactionForm 
                onSubmit={async (data) => {
                  await api.transactions.create(data);
                  refreshData();
                  setShowAddModal(false);
                }} 
              />
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

const TransactionsView = ({ transactions, filters, setFilters, onDelete, exportCSV }: any) => {
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
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {txs.map(tx => (
                      <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors group">
                        <td className="px-6 py-4 text-xs font-medium text-zinc-500">{format(parseISO(tx.date), 'MMM d')}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-zinc-900">{tx.category}</span>
                          {tx.notes && <p className="text-[10px] text-zinc-400 font-medium">{tx.notes}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            tx.type === 'income' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          )}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("text-sm font-bold", tx.type === 'income' ? "text-emerald-600" : "text-zinc-900")}>
                            {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
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
                    ))}
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

const AuthForm = ({ mode, onSubmit }: any) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema | typeof registerSchema>>({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
      <button disabled={isSubmitting} className="btn-primary w-full mt-6 py-4 text-sm font-bold shadow-xl shadow-zinc-900/20">
        {isSubmitting ? 'Processing...' : mode === 'login' ? 'Log In' : 'Create Account'}
      </button>
    </form>
  );
};

const TransactionForm = ({ onSubmit }: any) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'expense'
    }
  });

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
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Amount</label>
          <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" className="input-field h-12" placeholder="0.00" />
          {errors.amount && <p className="text-rose-500 text-xs mt-1.5 font-medium">Amount is required</p>}
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Category</label>
        <input {...register('category')} className="input-field h-12" placeholder="Food, Rent, Salary, etc." />
        {errors.category && <p className="text-rose-500 text-xs mt-1.5 font-medium">Category is required</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Date</label>
          <input {...register('date')} type="date" className="input-field h-12" />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Payment Method</label>
          <input {...register('payment_method')} className="input-field h-12" placeholder="Cash, Card, etc." />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Notes (Optional)</label>
        <textarea {...register('notes')} className="input-field h-24 resize-none" placeholder="Add some details..." />
      </div>
      <button disabled={isSubmitting} className="btn-primary w-full py-4 text-sm font-bold shadow-xl shadow-zinc-900/20">
        {isSubmitting ? 'Saving...' : 'Add Transaction'}
      </button>
    </form>
  );
};

const BudgetForm = ({ currentMonth, onSave }: any) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      month: currentMonth
    }
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="flex flex-col sm:flex-row gap-4 items-end">
      <div className="w-full sm:flex-1">
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Month</label>
        <input {...register('month')} type="month" className="input-field h-12" />
      </div>
      <div className="w-full sm:flex-1">
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Budget Amount</label>
        <input {...register('amount', { valueAsNumber: true })} type="number" className="input-field h-12" placeholder="0.00" />
        {errors.amount && <p className="text-rose-500 text-xs mt-1.5 font-medium">Amount is required</p>}
      </div>
      <button disabled={isSubmitting} className="btn-primary w-full sm:w-auto px-8 py-4 text-sm font-bold shadow-xl shadow-zinc-900/20">
        Save
      </button>
    </form>
  );
};
