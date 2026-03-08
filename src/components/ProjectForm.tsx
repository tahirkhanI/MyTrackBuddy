import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

const projectSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  studentName: z.string().min(1, 'Student name is required'),
  university: z.string().min(1, 'University is required'),
  submissionDate: z.string().min(1, 'Submission date is required'),
  developmentFee: z.number().min(0, 'Fee must be positive'),
  status: z.enum(['Pending', 'In Progress', 'Completed']),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => Promise<void>;
  initialData?: Partial<ProjectFormData>;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ onSubmit, initialData }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'Pending',
      submissionDate: format(new Date(), 'yyyy-MM-dd'),
      ...initialData
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Project Name</label>
          <input {...register('projectName')} className="input-field h-12" placeholder="e.g., IoT Smart Inhaler" />
          {errors.projectName && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.projectName.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Student Name</label>
          <input {...register('studentName')} className="input-field h-12" placeholder="e.g., John Doe" />
          {errors.studentName && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.studentName.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">University</label>
          <input {...register('university')} className="input-field h-12" placeholder="e.g., SIMATS" />
          {errors.university && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.university.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Submission Date</label>
          <input {...register('submissionDate')} type="date" className="input-field h-12" />
          {errors.submissionDate && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.submissionDate.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Development Fee (₹)</label>
          <input {...register('developmentFee', { valueAsNumber: true })} type="number" className="input-field h-12" placeholder="0" />
          {errors.developmentFee && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.developmentFee.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Initial Status</label>
        <select {...register('status')} className="input-field h-12">
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <button disabled={isSubmitting} className="btn-primary w-full py-4 text-sm font-bold shadow-xl shadow-zinc-900/20 sticky bottom-0">
        {isSubmitting ? 'Saving...' : 'Create Project'}
      </button>
    </form>
  );
};
