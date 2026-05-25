'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Target, CheckCircle, XCircle } from 'lucide-react';
import { invitesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    invitesApi.get(token).then(setInvite).catch(() => setInvite(null)).finally(() => setLoading(false));
  }, [token]);

  const respond = async (action: 'accept' | 'decline') => {
    if (!isAuthenticated()) {
      // Store invite token and redirect to register/login
      sessionStorage.setItem('pendingInvite', token);
      router.push('/register');
      return;
    }
    setResponding(true);
    try {
      if (action === 'accept') await invitesApi.accept(token);
      else await invitesApi.decline(token);
      setDone(action === 'accept' ? 'accepted' : 'declined');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Something went wrong');
    } finally {
      setResponding(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  if (!invite) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      This invite is invalid or has expired.
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        {done === 'accepted' ? (
          <>
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">You're in!</h2>
            <p className="text-gray-500 mt-2">You've accepted the role. You'll receive weekly reminders to check in.</p>
            <button onClick={() => router.push('/dashboard')} className="mt-6 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <XCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Invite declined</h2>
            <p className="text-gray-500 mt-2">You've declined this request.</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <Target size={32} className="mx-auto text-indigo-600 mb-2" />
          <h1 className="text-xl font-bold text-gray-900">You're invited!</h1>
          <p className="text-gray-500 text-sm mt-1">
            <strong>{invite.goal.owner.name}</strong> wants you as their accountability partner
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
          <p className="font-semibold text-gray-800">{invite.goal.title}</p>
          {invite.goal.description && (
            <p className="text-sm text-gray-500">{invite.goal.description}</p>
          )}
          <p className="text-sm text-gray-400">
            Deadline: <strong className="text-gray-700">{format(new Date(invite.goal.deadline), 'MMM d, yyyy')}</strong>
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center mb-4">
          As their partner, you'll verify progress and receive weekly reminders.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => respond('decline')}
            disabled={responding}
            className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => respond('accept')}
            disabled={responding}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {responding ? 'Accepting...' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
