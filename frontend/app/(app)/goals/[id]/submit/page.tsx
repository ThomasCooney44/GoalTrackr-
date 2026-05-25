'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Upload, Image } from 'lucide-react';
import { submissionsApi, uploadsApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export default function SubmitProofPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { setError('Please add a description'); return; }
    setLoading(true);
    setError('');
    try {
      let mediaUrl: string | undefined;
      if (file) mediaUrl = await uploadsApi.uploadFile(file);
      await submissionsApi.create(id, { content, mediaUrl });
      qc.invalidateQueries({ queryKey: ['goals', id] });
      router.push(`/goals/${id}`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to submit proof');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit Proof</h1>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What did you do?</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Describe your progress..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo proof (optional)</label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="rounded-xl max-h-48 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center text-gray-600 text-xs shadow"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-indigo-400 transition-colors">
                <Image size={24} className="text-gray-300 mb-2" />
                <span className="text-sm text-gray-500">Click to upload a photo</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            <Upload size={16} />
            {loading ? 'Submitting...' : 'Submit Proof'}
          </button>
        </div>
      </form>
    </div>
  );
}
