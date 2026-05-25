'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Upload, AlertTriangle } from 'lucide-react';
import { useGoal } from '@/lib/hooks/useGoals';
import { useAuthStore } from '@/lib/stores/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi, forfeitsApi } from '@/lib/api';

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { data: goal, isLoading } = useGoal(id);
  const qc = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: ({ submissionId, status, reviewNote }: any) =>
      submissionsApi.review(submissionId, { status, reviewNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', id] }),
  });

  const forfeitMutation = useMutation({
    mutationFn: ({ action }: { action: 'confirm' | 'waive' }) =>
      action === 'confirm' ? forfeitsApi.confirm(id) : forfeitsApi.waive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', id] }),
  });

  if (isLoading) return <Spinner />;
  if (!goal) return <p>Goal not found</p>;

  const isOwner = goal.ownerId === user?.id;
  const partner = goal.participants?.[0];
  const isPartner = partner?.userId === user?.id && partner?.status === 'ACCEPTED';
  const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <StatusBadge status={goal.status} />
            <h1 className="text-xl font-bold text-gray-900 mt-2">{goal.title}</h1>
            {goal.description && <p className="text-gray-500 text-sm mt-1">{goal.description}</p>}
          </div>
        </div>

        <div className="flex gap-4 mt-4 text-sm text-gray-500">
          <span>Deadline: <strong className="text-gray-800">{format(new Date(goal.deadline), 'MMM d, yyyy')}</strong></span>
          {goal.status === 'ACTIVE' && (
            <span className={daysLeft <= 3 ? 'text-red-600 font-semibold' : ''}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
            </span>
          )}
        </div>

        {isOwner && goal.status === 'ACTIVE' && (
          <Link
            href={`/goals/${id}/submit`}
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Upload size={16} />
            Submit Proof
          </Link>
        )}
      </div>

      {/* Partner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Accountability Partner</h2>
        {partner ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                {(partner.user?.name ?? partner.inviteEmail)[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {partner.user?.name ?? partner.inviteEmail}
                </p>
                <p className="text-xs text-gray-400">{partner.inviteEmail}</p>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              partner.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
              partner.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-600'
            }`}>
              {partner.status.charAt(0) + partner.status.slice(1).toLowerCase()}
            </span>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No partner assigned</p>
        )}
      </div>

      {/* Forfeit */}
      {goal.forfeit && (
        <div className={`rounded-2xl border p-5 ${
          goal.forfeit.status === 'TRIGGERED' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className={goal.forfeit.status === 'TRIGGERED' ? 'text-red-500' : 'text-gray-400'} />
            <h2 className="font-semibold text-gray-700">Forfeit</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
              goal.forfeit.status === 'TRIGGERED' ? 'bg-red-100 text-red-700' :
              goal.forfeit.status === 'CONFIRMED' ? 'bg-orange-100 text-orange-700' :
              goal.forfeit.status === 'WAIVED' ? 'bg-gray-100 text-gray-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {goal.forfeit.status.charAt(0) + goal.forfeit.status.slice(1).toLowerCase()}
            </span>
          </div>
          <p className="text-sm text-gray-700">{goal.forfeit.description}</p>

          {isPartner && goal.forfeit.status === 'TRIGGERED' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => forfeitMutation.mutate({ action: 'confirm' })}
                className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Forfeit
              </button>
              <button
                onClick={() => forfeitMutation.mutate({ action: 'waive' })}
                className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Waive Forfeit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Submissions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-3">
          Proof Submissions ({goal.submissions?.length ?? 0})
        </h2>
        {goal.submissions?.length === 0 ? (
          <p className="text-gray-400 text-sm">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {goal.submissions?.map((sub: any) => (
              <div key={sub.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{sub.content}</p>
                    {sub.mediaUrl && (
                      <img src={sub.mediaUrl} alt="Proof" className="mt-2 rounded-lg max-h-48 object-cover" />
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                    </p>
                    {sub.reviewNote && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{sub.reviewNote}"</p>
                    )}
                  </div>
                  <SubmissionStatusBadge status={sub.status} />
                </div>

                {isPartner && sub.status === 'PENDING' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => reviewMutation.mutate({ submissionId: sub.id, status: 'APPROVED' })}
                      className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const note = prompt('Reason for rejection (optional):');
                        reviewMutation.mutate({ submissionId: sub.id, status: 'REJECTED', reviewNote: note || undefined });
                      }}
                      className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    ACTIVE: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? ''}`}>{status}</span>;
}

function SubmissionStatusBadge({ status }: { status: string }) {
  if (status === 'APPROVED') return <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />;
  if (status === 'REJECTED') return <XCircle size={18} className="text-red-400 flex-shrink-0" />;
  return <Clock size={18} className="text-yellow-500 flex-shrink-0" />;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}
