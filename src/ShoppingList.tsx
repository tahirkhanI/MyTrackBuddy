import React, { useMemo } from 'react';
import { useProject } from './ProjectContext';
import { Card } from './components/UI';
import { 
  Package, 
  ShoppingCart, 
  CheckCircle2, 
  Circle, 
  Clock, 
  TrendingUp,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Component } from './types';
import { motion } from 'motion/react';

interface GroupedComponent {
  name: string;
  status: Component['status'];
  qty: number;
  totalEstimatedCost: number;
  projectRefs: { projectId: string; componentId: string; projectName: string }[];
}

export const ShoppingList: React.FC = () => {
  const { projects, updateComponent } = useProject();

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

  const sections = [
    { id: 'Needed', label: 'To Buy', icon: ShoppingCart, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'Ordered', label: 'Ordered', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'Available', label: 'In Stock', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' }
  ];

  const handleMarkAsAvailable = async (groupedComp: GroupedComponent) => {
    const promises = groupedComp.projectRefs.map(ref => 
      updateComponent(ref.projectId, ref.componentId, { status: 'Available' })
    );
    await Promise.all(promises);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Master Shopping List</h2>
          <p className="text-zinc-500 text-sm">Aggregated hardware needs across all active projects</p>
        </div>
        <Card className="px-6 py-4 bg-zinc-900 text-white border-none flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Estimated Total</p>
            <p className="text-xl font-bold">₹{estimatedTotal.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {sections.map(section => {
          const items = groupedComponents.filter(c => c.status === section.id);
          
          return (
            <div key={section.id} className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <section.icon className={`w-5 h-5 ${section.color}`} />
                <h3 className="font-bold text-zinc-900">{section.label}</h3>
                <span className="ml-auto text-xs font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <motion.div
                    key={`${item.name}-${item.status}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-zinc-900">{item.name}</h4>
                            <span className="text-xs font-bold text-zinc-400">x{item.qty}</span>
                          </div>
                          <p className="text-xs font-bold text-zinc-500 mt-0.5">₹{item.totalEstimatedCost.toLocaleString()}</p>
                        </div>
                        {section.id === 'Needed' && (
                          <button 
                            onClick={() => handleMarkAsAvailable(item)}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-100"
                            title="Mark all as Available"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {item.projectRefs.map(ref => (
                          <span 
                            key={`${ref.projectId}-${ref.componentId}`}
                            className="text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded flex items-center gap-1"
                          >
                            {ref.projectName}
                          </span>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                ))}

                {items.length === 0 && (
                  <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
                    <p className="text-sm text-zinc-400 font-medium">No items in this category</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
