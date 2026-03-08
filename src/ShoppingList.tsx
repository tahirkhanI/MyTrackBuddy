import React, { useState, useMemo } from 'react';
import { useProject } from './ProjectContext';
import { Card } from './components/UI';
import { 
  Package, 
  ShoppingCart, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Box,
  Truck
} from 'lucide-react';
import { Component } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GroupedComponent {
  name: string;
  status: Component['status'];
  qty: number;
  totalEstimatedCost: number;
  projectRefs: { projectId: string; componentId: string; projectName: string }[];
}

type TabType = 'shopping' | 'ordered' | 'inventory';

export const ShoppingList: React.FC = () => {
  const { projects, updateComponent } = useProject();
  const [activeTab, setActiveTab] = useState<TabType>('shopping');

  const groupedComponents = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'Completed');
    const allComponents: GroupedComponent[] = [];

    activeProjects.forEach(project => {
      (project.components || []).forEach(comp => {
        const existing = allComponents.find(
          c => c.name.toLowerCase() === comp.componentName.toLowerCase() && c.status === comp.status
        );

        const ref = { 
          projectId: project.id, 
          componentId: comp.id, 
          projectName: project.projectName 
        };

        if (existing) {
          existing.qty += 1;
          existing.totalEstimatedCost += comp.estimatedCost;
          existing.projectRefs.push(ref);
        } else {
          allComponents.push({
            name: comp.componentName,
            status: comp.status,
            qty: 1,
            totalEstimatedCost: comp.estimatedCost,
            projectRefs: [ref]
          });
        }
      });
    });

    return allComponents;
  }, [projects]);

  const estimatedTotal = useMemo(() => {
    return groupedComponents
      .filter(c => c.status === 'Needed')
      .reduce((acc, c) => acc + c.totalEstimatedCost, 0);
  }, [groupedComponents]);

  const handleMarkAsAvailable = async (groupedComp: GroupedComponent) => {
    const promises = groupedComp.projectRefs.map(ref => 
      updateComponent(ref.projectId, ref.componentId, { status: 'Available' })
    );
    await Promise.all(promises);
  };

  const tabs = [
    { id: 'shopping', label: 'Shopping List', icon: ShoppingCart, status: 'Needed' },
    { id: 'ordered', label: 'Ordered', icon: Truck, status: 'Ordered' },
    { id: 'inventory', label: 'Inventory', icon: Box, status: 'Available' },
  ];

  const currentItems = useMemo(() => {
    const targetStatus = tabs.find(t => t.id === activeTab)?.status;
    return groupedComponents.filter(c => c.status === targetStatus);
  }, [groupedComponents, activeTab]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Hardware Manager</h2>
          <p className="text-zinc-500 text-sm">Track your components across all projects</p>
        </div>

        {/* Tab Bar */}
        <div className="flex p-1 bg-zinc-100 rounded-2xl w-full max-w-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all",
                activeTab === tab.id 
                  ? "bg-white text-zinc-900 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Shopping Total - Only for Shopping List tab */}
          {activeTab === 'shopping' && (
            <Card className="p-6 bg-rose-600 text-white border-none flex items-center justify-between overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-200 mb-1">Estimated Shopping Total</p>
                <h3 className="text-3xl font-bold">₹{estimatedTotal.toLocaleString()}</h3>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center relative z-10">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            </Card>
          )}

          {/* List Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentItems.map((item, idx) => (
              <motion.div
                key={`${item.name}-${item.status}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="p-4 hover:shadow-lg transition-all group border-zinc-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900 text-lg">{item.name}</h4>
                        <span className="bg-zinc-100 text-zinc-600 text-xs font-bold px-2 py-0.5 rounded-full">
                          x{item.qty}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-zinc-500">
                        ₹{item.totalEstimatedCost.toLocaleString()}
                      </p>
                    </div>
                    
                    {activeTab === 'shopping' && (
                      <button 
                        onClick={() => handleMarkAsAvailable(item)}
                        className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Mark as Available"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Required For</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.projectRefs.map(ref => (
                        <span 
                          key={`${ref.projectId}-${ref.componentId}`}
                          className="text-[10px] font-bold bg-zinc-50 text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                        >
                          <div className="w-1 h-1 rounded-full bg-zinc-400" />
                          {ref.projectName}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {currentItems.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-zinc-300" />
                </div>
                <h3 className="text-zinc-900 font-bold">No items found</h3>
                <p className="text-sm text-zinc-500">Everything looks clear in this category</p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
