'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateGoal } from '@/lib/hooks/useGoals';

const schema = z.object({
  title: z.string().min(3, 'At least 3 characters').max(100),
  description: z.string().optional(),
  deadline: z.string().min(1, 'Please set a deadline'),
  checkInInterval: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  partnerEmail: z.string().email('Enter a valid email'),
  forfeit: z.object({
    description: z.string().min(5, 'Describe the forfeit'),
  }),
});

type FormData = z.infer<typeof schema>;

export default function NewGoalPage() {
  const router = useRouter();
  const createGoal = useCreateGoal();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { checkInInterval: 'WEEKLY' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const goal = await createGoal.mutateAsync(data);
      router.push(`/goals/${goal.id}`);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a New Goal</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Goal Details</h2>

          <Field label="Title" error={errors.title?.message}>
            <input {...register('title')} placeholder="e.g. Run 5km three times a week" className={input} />
          </Field>

          <Field label="Description (optional)" error={errors.description?.message}>
            <textarea {...register('description')} rows={3} placeholder="What are you trying to achieve?" className={input} />
          </Field>

          <Field label="Deadline" error={errors.deadline?.message}>
            <input {...register('deadline')} type="date" className={input} min={new Date().toISOString().split('T')[0]} />
          </Field>

          <Field label="Check-in frequency" error={errors.checkInInterval?.message}>
            <select {...register('checkInInterval')} className={input}>
              <option value="NONE">No recurring check-ins</option>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Every 2 weeks</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </Field>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Accountability Partner</h2>
          <Field label="Partner's email" error={errors.partnerEmail?.message}>
            <input {...register('partnerEmail')} type="email" placeholder="friend@example.com" className={input} />
          </Field>
          <p className="text-xs text-gray-400">They'll receive an invite email and can accept or decline.</p>
        </div>

        <div className="bg-white rounded-2xl border border-orange-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Forfeit</h2>
          <Field label="What happens if you fail?" error={errors.forfeit?.description?.message}>
            <input {...register('forfeit.description')} placeholder='e.g. "Pay €20 to charity"' className={input} />
          </Field>
          <p className="text-xs text-gray-400">Your partner will confirm enforcement if you miss the deadline.</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? 'Creating goal...' : 'Create Goal & Send Invite'}
        </button>
      </form>
    </div>
  );
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
