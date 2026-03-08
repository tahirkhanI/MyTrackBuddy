import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectDetailsProps {
  project: Project;
  onClose: () => void;
}

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onClose }) => {
  const { 
    updateProject, 
    addComponent, 
    updateComponent, 
    deleteComponent, 
    getComponents,
    addPayment,
    transactions
  } = useProject();

  const [components, setComponents] = useState<Component[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [newComponent, setNewComponent] = useState({ name: '', cost: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadComponents();
  }, [project.id]);

  const loadComponents = async () => {
    setLoadingComponents(true);
    const data = await getComponents(project.id);
    setComponents(data);
    setLoadingComponents(false);
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    await addPayment(project.id, amount);
    setPaymentAmount('');
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
    loadComponents();
  };

  const toggleComponentStatus = async (comp: Component) => {
    const nextStatus: Component['status'] = 
      comp.status === 'Needed' ? 'Ordered' : 
      comp.status === 'Ordered' ? 'Available' : 'Needed';
    
    await updateComponent(project.id, comp.id, { status: nextStatus });
    loadComponents();
  };

  const generateQuotation = () => {
    const hardwareCost = components.reduce((acc, c) => acc + c.estimatedCost, 0);
    const grandTotal = hardwareCost + project.developmentFee;
    const advance = grandTotal * 0.5;

    const componentList = components.map(c => `- ${c.componentName}: ₹${c.estimatedCost.toLocaleString()}`).join('\n');

    const template = `Hello ${project.studentName}, here is the estimate for your ${project.projectName} project.

${componentList}

Hardware Cost: ₹${hardwareCost.toLocaleString()}
Development Fee: ₹${project.developmentFee.toLocaleString()}
Total Project Cost: ₹${grandTotal.toLocaleString()}

Please provide a 50% advance of ₹${advance.toLocaleString()} to begin component ordering.`;

    navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hardwareCost = components.reduce((acc, c) => acc + c.estimatedCost, 0);
  const totalCost = hardwareCost + project.developmentFee;
  const balance = totalCost - project.totalPaid;
  const daysLeft = differenceInDays(parseISO(project.submissionDate), new Date());
  const progress = Math.min(100, Math.max(0, 100 - (daysLeft / 30) * 100)); // Assuming 30 days project cycle for visual

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-50 lg:relative lg:inset-auto lg:h-full lg:rounded-3xl lg:border lg:border-zinc-200 lg:shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 p-4 lg:p-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl lg:hidden">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{project.projectName}</h2>
            <p className="text-sm text-zinc-500">{project.studentName} • {project.university}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={generateQuotation}
            className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Generate Estimate'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
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

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-zinc-900 text-white border-none">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Cost</p>
                <p className="text-xl font-bold">₹{totalCost.toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-emerald-50 border-emerald-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Paid</p>
                <p className="text-xl font-bold text-emerald-700">₹{project.totalPaid.toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-rose-50 border-rose-100 col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Remaining Balance</p>
                    <p className="text-2xl font-bold text-rose-700">₹{balance.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Dev Fee</p>
                    <p className="text-sm font-bold text-zinc-600">₹{project.developmentFee.toLocaleString()}</p>
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
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Amount"
                        className="input-field flex-1"
                      />
                      <button onClick={handleAddPayment} className="btn-primary px-4">Add</button>
                      <button onClick={() => setShowAddPayment(false)} className="btn-secondary px-4">Cancel</button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Component Tracker */}
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
                      onClick={() => deleteComponent(project.id, comp.id).then(loadComponents)}
                      className="p-2 text-zinc-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {components.length === 0 && !loadingComponents && (
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
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        value={newComponent.cost}
                        onChange={(e) => setNewComponent({ ...newComponent, cost: e.target.value })}
                        placeholder="Estimated Cost"
                        className="input-field flex-1"
                      />
                      <button onClick={handleAddComponent} className="btn-primary px-4">Add</button>
                      <button onClick={() => setShowAddComponent(false)} className="btn-secondary px-4">Cancel</button>
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
