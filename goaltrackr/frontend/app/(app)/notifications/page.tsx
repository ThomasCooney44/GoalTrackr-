'use client';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkAllRead } from '@/lib/hooks/useNotifications';

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();

  const notifications = data?.notifications ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {notifications.some((n: any) => !n.read) && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border p-4 transition-all ${
                !n.read ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
