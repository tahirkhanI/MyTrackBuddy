import React, { useMemo, useState } from 'react';
import { Project } from '../types';
import { Card } from './UI';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Calendar, User, School, ArrowRight, Clock, Search, Filter, SortAsc } from 'lucide-react';
import { motion } from 'motion/react';

interface ProjectBoardProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projects, onProjectClick }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const matchesSearch = p.projectName.toLowerCase().includes(search.toLowerCase()) || 
                            p.studentName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();
        }
        return a.projectName.localeCompare(b.projectName);
      });
  }, [projects, search, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search projects or students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 h-11"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 md:w-40">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field pl-10 h-11 text-sm appearance-none"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="relative flex-1 md:w-40">
              <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-field pl-10 h-11 text-sm appearance-none"
              >
                <option value="date">Submission Date</option>
                <option value="name">Project Name</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Project List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredProjects.map(project => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onClick={() => onProjectClick(project)} 
          />
        ))}
        {filteredProjects.length === 0 && (
          <div className="py-20 text-center bg-white rounded-3xl border border-zinc-100">
            <p className="text-zinc-400 font-medium">No projects found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectCard: React.FC<{ project: Project; onClick: () => void }> = ({ project, onClick }) => {
  const daysLeft = differenceInDays(parseISO(project.submissionDate), new Date());
  const isOverdue = daysLeft < 0 && project.status !== 'Completed';

  const statusColors = {
    'Pending': 'bg-rose-500 border-rose-200',
    'In Progress': 'bg-amber-500 border-amber-200',
    'Completed': 'bg-emerald-500 border-emerald-200'
  };

  return (
    <motion.div
      layoutId={project.id}
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl shadow-sm border-l-4 ${statusColors[project.status].split(' ')[1]} border-y border-r border-zinc-100 hover:shadow-md hover:border-zinc-200 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${statusColors[project.status].split(' ')[0]} shrink-0`} />
        <div>
          <h4 className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">
            {project.projectName}
          </h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <User className="w-3 h-3" />
              <span>{project.studentName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <School className="w-3 h-3" />
              <span>{project.university}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-8 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-50">
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
        <div className="text-right">
          <div className="text-xs font-bold text-zinc-900">
            ₹{project.developmentFee.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-400 font-medium">
            Paid: ₹{project.totalPaid.toLocaleString()}
          </div>
        </div>
        <ArrowRight className="hidden sm:block w-4 h-4 text-zinc-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
      </div>
    </motion.div>
  );
};
