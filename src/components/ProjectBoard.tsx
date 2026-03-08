import React, { useMemo } from 'react';
import { Project } from '../types';
import { Card } from './UI';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Calendar, User, School, ArrowRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface ProjectBoardProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projects, onProjectClick }) => {
  const columns = [
    { id: 'Pending', title: 'Pending', color: 'bg-amber-500' },
    { id: 'In Progress', title: 'In Progress', color: 'bg-indigo-500' },
    { id: 'Completed', title: 'Completed', color: 'bg-emerald-500' },
  ];

  const groupedProjects = useMemo(() => {
    const groups: Record<string, Project[]> = {
      'Pending': [],
      'In Progress': [],
      'Completed': [],
    };
    projects.forEach(p => {
      if (groups[p.status]) {
        groups[p.status].push(p);
      }
    });
    return groups;
  }, [projects]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      {columns.map(column => (
        <div key={column.id} className="flex flex-col h-full min-h-[500px]">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${column.color}`} />
              <h3 className="font-bold text-zinc-900">{column.title}</h3>
              <span className="bg-zinc-100 text-zinc-500 text-xs font-bold px-2 py-0.5 rounded-full">
                {groupedProjects[column.id].length}
              </span>
            </div>
          </div>

          <div className="flex-1 bg-zinc-50/50 rounded-3xl p-4 space-y-4 border border-zinc-100">
            {groupedProjects[column.id].map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onClick={() => onProjectClick(project)} 
              />
            ))}
            {groupedProjects[column.id].length === 0 && (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-2xl">
                <p className="text-zinc-400 text-sm font-medium">No projects</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const ProjectCard: React.FC<{ project: Project; onClick: () => void }> = ({ project, onClick }) => {
  const daysLeft = differenceInDays(parseISO(project.submissionDate), new Date());
  const isOverdue = daysLeft < 0 && project.status !== 'Completed';

  return (
    <motion.div
      layoutId={project.id}
      onClick={onClick}
      className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md hover:border-zinc-200 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
          {project.projectName}
        </h4>
        <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <User className="w-3 h-3" />
          <span className="truncate">{project.studentName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <School className="w-3 h-3" />
          <span className="truncate">{project.university}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
          isOverdue ? 'text-rose-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-zinc-400'
        }`}>
          <Clock className="w-3 h-3" />
          {project.status === 'Completed' ? (
            'Done'
          ) : isOverdue ? (
            `${Math.abs(daysLeft)} days overdue`
          ) : (
            `${daysLeft} days left`
          )}
        </div>
        <div className="text-xs font-bold text-zinc-900">
          ₹{project.developmentFee.toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
};
