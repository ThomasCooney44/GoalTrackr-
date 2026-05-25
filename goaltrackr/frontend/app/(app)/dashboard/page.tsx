'use client';
import Link from 'next/link';
import { Plus, Target, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useGoals } from '@/lib/hooks/useGoals';
import { useAuthStore } from '@/lib/stores/auth';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
  ACTIVE: { label: 'Active', color: 'bg-blue-100 text-blue-700', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: goals, isLoading } = useGoals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const activeGoals = goals?.filter((g) => g.status === 'ACTIVE') ?? [];
  const pastGoals = goals?.filter((g) => g.status !== 'ACTIVE') ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeGoals.length > 0
              ? `You have ${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}`
              : 'No active goals — create one to get started'}
          </p>
        </div>
        <Link
          href="/goals/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          New Goal
        </Link>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Active Goals
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {goals?.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Target size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No goals yet</p>
          <p className="text-gray-400 text-sm mb-4">Create your first goal and invite a friend to keep you accountable</p>
          <Link
            href="/goals/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Create a Goal
          </Link>
        </div>
      )}

      {/* Past Goals */}
      {pastGoals.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Past Goals
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pastGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: any }) {
  const { label, color, icon: StatusIcon } = statusConfig[goal.status as keyof typeof statusConfig];
  const partner = goal.participants?.[0];
  const daysLeft = goal.status === 'ACTIVE'
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1 mr-2">
          {goal.title}
        </h3>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>
          <StatusIcon size={11} />
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
        <span>
          {daysLeft !== null
            ? daysLeft > 0
              ? `${daysLeft}d left`
              : 'Overdue'
            : formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })}
        </span>
        {partner && (
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
              {(partner.user?.name ?? partner.inviteEmail)[0].toUpperCase()}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              partner.status === 'ACCEPTED' ? 'bg-green-50 text-green-600' :
              partner.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' :
              'bg-red-50 text-red-500'
            }`}>
              {partner.status.toLowerCase()}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
