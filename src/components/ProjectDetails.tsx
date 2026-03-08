import React, { useState, useEffect, useMemo } from 'react';
import { Project, Component, Transaction } from '../types';
import { useProject } from '../ProjectContext';
import { Card } from './UI';
import { 
  X, 
  ChevronLeft, 
  Calendar, 
  User, 
  School, 
  IndianRupee, 
  Package, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Clock,
  Share2,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  History,
  ArrowUpRight
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProjectDetailsProps {
  project: Project;
  onClose: () => void;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onClose }) => {
  const { 
    updateProject, 
    deleteProject,
    addComponent, 
    updateComponent, 
    deleteComponent, 
    subscribeToComponents,
    addPayment,
    transactions
  } = useProject();

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [newComponent, setNewComponent] = useState({ name: '', cost: '' });
  const [copied, setCopied] = useState(false);
  const [threeDPrintingCost, setThreeDPrintingCost] = useState(project.threeDPrintingCost?.toString() || '0');
  const [developmentFee, setDevelopmentFee] = useState(project.developmentFee?.toString() || '0');
  const [pendingNotes, setPendingNotes] = useState(project.pendingNotes || '');

  const components = project.components || [];

  const projectTransactions = useMemo(() => {
    return transactions.filter(t => t.linkedProjectId === project.id);
  }, [transactions, project.id]);

  useEffect(() => {
    setThreeDPrintingCost(project.threeDPrintingCost?.toString() || '0');
    setDevelopmentFee(project.developmentFee?.toString() || '0');
    setPendingNotes(project.pendingNotes || '');
  }, [project.id]);

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || !paymentDate) return;
    await addPayment(project.id, amount, paymentDate);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowAddPayment(false);
  };

  const handleAddComponent = async () => {
    if (!newComponent.name || !newComponent.cost) return;
    await addComponent(project.id, {
      componentName: newComponent.name,
      estimatedCost: parseFloat(newComponent.cost),
      actualCost: 0,
      status: 'Needed'
    });
    setNewComponent({ name: '', cost: '' });
    setShowAddComponent(false);
  };

  const toggleComponentStatus = async (comp: Component) => {
    const nextStatus: Component['status'] = 
      comp.status === 'Needed' ? 'Ordered' : 
      comp.status === 'Ordered' ? 'Available' : 'Needed';
    
    await updateComponent(project.id, comp.id, { status: nextStatus });
  };

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await deleteProject(project.id);
        onClose();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  const handleUpdateThreeDPrintingCost = async () => {
    const cost = parseFloat(threeDPrintingCost);
    if (!isNaN(cost)) {
      await updateProject(project.id, { threeDPrintingCost: cost });
    }
  };

  const handleUpdateDevelopmentFee = async () => {
    const fee = parseFloat(developmentFee);
    if (!isNaN(fee)) {
      await updateProject(project.id, { developmentFee: fee });
    }
  };

  const handleUpdatePendingNotes = async () => {
    await updateProject(project.id, { pendingNotes });
  };

  const generateInvoice = () => {
    try {
      const doc = new jsPDF();
      const totalProjectCost = project.developmentFee;
      const amountPaid = project.totalPaid;
      const pendingAmount = totalProjectCost - amountPaid;

      // Header - Blue Banner
      doc.setFillColor(0, 0, 255); // Deep Blue
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('0&1 Project Solutions', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice #: INV-${project.id.slice(0, 6).toUpperCase()}`, 105, 30, { align: 'center' });
      doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 105, 35, { align: 'center' });

      // Client Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text('Bill To:', 20, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(project.studentName, 20, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(project.university, 20, 68);
      doc.text(`Project: ${project.projectName}`, 20, 74);

      // Line Items Table
      const tableData = [
        ['Total Project Cost (Development Fee)', `₹${totalProjectCost.toLocaleString()}`],
        ['Amount Paid', `₹${amountPaid.toLocaleString()}`]
      ];

      autoTable(doc, {
        startY: 85,
        head: [['Description', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: { 1: { halign: 'right' } }
      });

      // Totals Box - Prominent Bordered Box
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setDrawColor(0, 0, 255);
      doc.setLineWidth(0.5);
      doc.rect(110, finalY, 80, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Pending Amount:', 115, finalY + 12);
      doc.text(`₹${pendingAmount.toLocaleString()}`, 185, finalY + 12, { align: 'right' });

      // Footer
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Bank Details:', 20, 250);
      doc.setFont('helvetica', 'normal');
      doc.text('Gpay or Phonepe - 7093617528', 20, 256);
      doc.text('Address: Poonamallee, Chennai, Tamil Nadu, 600124', 20, 262);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Thank you for choosing 0&1 Project Solutions!', 105, 280, { align: 'center' });

      doc.save(`Invoice_${project.projectName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const hardwareCost = components.reduce((acc, c) => acc + c.estimatedCost, 0);
  const estimatedProfit = project.developmentFee - hardwareCost - (project.threeDPrintingCost || 0);
  const balance = project.developmentFee - project.totalPaid;
  const daysLeft = differenceInDays(parseISO(project.submissionDate), new Date());
  const progress = Math.min(100, Math.max(0, 100 - (daysLeft / 30) * 100));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-50 lg:relative lg:inset-auto lg:h-full lg:rounded-3xl lg:border lg:border-zinc-200 lg:shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 p-4 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-10 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl lg:hidden">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{project.projectName}</h2>
            <p className="text-sm text-zinc-500">{project.studentName} • {project.university}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={project.status}
            onChange={(e) => updateProject(project.id, { status: e.target.value as any })}
            className="text-sm font-bold bg-zinc-100 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-zinc-900"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <button 
            onClick={generateInvoice}
            className="btn-primary flex items-center gap-2 text-sm py-2 px-4 bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="w-4 h-4" />
            Generate Invoice
          </button>
          <button 
            onClick={handleDeleteProject}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Delete Project"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
        {/* Profit Metric */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <Card className="p-4 bg-indigo-600 text-white border-none">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-1">Estimated Profit</p>
              <p className="text-2xl font-bold">₹{estimatedProfit.toLocaleString()}</p>
           </Card>
           <Card className="p-4 bg-zinc-900 text-white border-none">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Development Fee</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">₹</span>
                <input 
                  type="number"
                  value={developmentFee}
                  onChange={(e) => setDevelopmentFee(e.target.value)}
                  onBlur={handleUpdateDevelopmentFee}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-bold text-white"
                />
              </div>
           </Card>
           <Card className="p-4 bg-white border-zinc-200">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">3D Print Cost</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">₹</span>
                <input 
                  type="number"
                  value={threeDPrintingCost}
                  onChange={(e) => setThreeDPrintingCost(e.target.value)}
                  onBlur={handleUpdateThreeDPrintingCost}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-bold"
                />
              </div>
           </Card>
        </div>

        {/* Pending Notes */}
        {project.status === 'Pending' && (
          <Card className="p-4 bg-amber-50 border-amber-100">
            <div className="flex items-center gap-2 mb-3 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Pending Notes</h4>
            </div>
            <textarea 
              value={pendingNotes}
              onChange={(e) => setPendingNotes(e.target.value)}
              onBlur={handleUpdatePendingNotes}
              placeholder="What exactly is pending? (e.g. Waiting on sensor delivery)"
              className="w-full bg-white/50 border-amber-200 rounded-xl p-3 text-sm focus:ring-amber-500 focus:border-amber-500 min-h-[80px]"
            />
          </Card>
        )}

        {/* Progress Section */}
        <section>
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-500">
              <Clock className="w-4 h-4" />
              {daysLeft < 0 ? 'Overdue' : `${daysLeft} days remaining`}
            </div>
            <span className="text-sm font-bold text-zinc-900">{format(parseISO(project.submissionDate), 'MMM d, yyyy')}</span>
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full rounded-full ${daysLeft < 0 ? 'bg-rose-500' : 'bg-zinc-900'}`}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Finance Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <IndianRupee className="w-5 h-5" />
                Financial Overview
              </h3>
              <button 
                onClick={() => setShowAddPayment(true)}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                Log Payment
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4 bg-zinc-900 text-white border-none">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Project Cost</p>
                <p className="text-xl font-bold">₹{project.developmentFee.toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-emerald-50 border-emerald-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Paid</p>
                <p className="text-xl font-bold text-emerald-700">₹{project.totalPaid.toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-rose-50 border-rose-100 sm:col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Remaining Balance</p>
                    <p className="text-2xl font-bold text-rose-700">₹{balance.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Hardware Cost</p>
                    <p className="text-sm font-bold text-zinc-600">₹{hardwareCost.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </div>

            <AnimatePresence>
              {showAddPayment && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="p-4 bg-zinc-50 border-zinc-200">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Amount (₹)</label>
                        <input 
                          type="number" 
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Payment Date</label>
                        <input 
                          type="date" 
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleAddPayment}
                          className="flex-1 bg-zinc-900 text-white rounded-lg px-3 py-2 text-sm font-bold hover:bg-zinc-800 transition-colors"
                        >
                          Confirm Payment
                        </button>
                        <button 
                          onClick={() => setShowAddPayment(false)}
                          className="flex-1 bg-zinc-100 text-zinc-600 rounded-lg px-3 py-2 text-sm font-bold hover:bg-zinc-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5" />
              Payment History
            </h3>
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-zinc-100">
                {projectTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">₹{tx.amount.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">{format(parseISO(tx.date), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Paid</span>
                    </div>
                  </div>
                ))}
                {projectTransactions.length === 0 && (
                  <div className="p-8 text-center text-zinc-400">
                    <p className="text-sm font-medium">No payments logged yet.</p>
                  </div>
                )}
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Hardware Components
              </h3>
              <button 
                onClick={() => setShowAddComponent(true)}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                Add Component
              </button>
            </div>

            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-zinc-100">
                {components.map(comp => (
                  <div key={comp.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleComponentStatus(comp)}
                        className={`p-1 rounded-lg transition-colors ${
                          comp.status === 'Available' ? 'text-emerald-600 bg-emerald-50' : 
                          comp.status === 'Ordered' ? 'text-amber-600 bg-amber-50' : 'text-zinc-300'
                        }`}
                      >
                        {comp.status === 'Available' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{comp.componentName}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {comp.status} • ₹{comp.estimatedCost.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteComponent(project.id, comp.id)}
                      className="p-2 text-zinc-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {components.length === 0 && (
                  <div className="p-8 text-center text-zinc-400">
                    <p className="text-sm font-medium">No components added yet.</p>
                  </div>
                )}
              </div>
            </Card>

            <AnimatePresence>
              {showAddComponent && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="p-4 bg-zinc-50 border-zinc-200 space-y-3">
                    <input 
                      value={newComponent.name}
                      onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                      placeholder="Component Name (e.g. ESP32)"
                      className="input-field w-full"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="number"
                        value={newComponent.cost}
                        onChange={(e) => setNewComponent({ ...newComponent, cost: e.target.value })}
                        placeholder="Estimated Cost"
                        className="input-field flex-1"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddComponent} className="btn-primary flex-1 sm:flex-none px-4">Add</button>
                        <button onClick={() => setShowAddComponent(false)} className="btn-secondary flex-1 sm:flex-none px-4">Cancel</button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
};
