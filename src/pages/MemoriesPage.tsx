import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MemoryType, Memory } from '@/types/memory';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { memoryKeys, getMemories, deleteMemory, createMemory } from '@/features/memories';
import { classifyApiError } from '@/lib/utils/error';

const formatMemoryDate = (dateString?: string | null) => {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const MemoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType>('FACT');
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch real memories from backend
  const {
    data: memories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: memoryKeys.list(
      selectedType === 'ALL' ? undefined : { type: selectedType as MemoryType },
    ),
    queryFn: () =>
      getMemories(selectedType === 'ALL' ? undefined : { type: selectedType as MemoryType }),
    refetchInterval: 15000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
    onError: (err: unknown) => {
      const classified = classifyApiError(err, 'Failed to delete memory.');
      setActionError(classified.message);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { type: MemoryType; content: string }) => createMemory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
      setShowAddModal(false);
      setNewContent('');
      setActionError(null);
    },
    onError: (err: unknown) => {
      const classified = classifyApiError(err, 'Failed to create memory.');
      setActionError(classified.message);
    },
  });

  const getTypeBadgeVariant = (type: MemoryType): 'brand' | 'ai' | 'success' | 'warning' => {
    switch (type) {
      case 'FACT':
        return 'brand';
      case 'PREFERENCE':
        return 'ai';
      case 'GOAL':
        return 'success';
      case 'INSTRUCTION':
        return 'warning';
      default:
        return 'brand';
    }
  };

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    createMutation.mutate({ type: newType, content: newContent.trim() });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this memory? It will no longer be injected into AI prompts.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-display font-bold text-white tracking-tight">
            Cognitive Memories
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Persistent context extracted during conversations and injected into query prompts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="shadow-subtle"
          >
            + Add Memory
          </Button>
          <Badge variant="neutral" size="sm">
            Max Bounded: 10
          </Badge>
          <Badge variant="success" size="sm" dot>
            Auto-Extraction Active
          </Badge>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300 flex items-center justify-between animate-in fade-in">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {['ALL', 'FACT', 'PREFERENCE', 'GOAL', 'INSTRUCTION'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedType === type
                ? 'bg-violet-600/25 text-violet-200 border border-violet-500/35 shadow-sm shadow-violet-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Memory Items */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-4 space-y-3 animate-pulse border-subtle">
              <div className="h-4 bg-surface-muted rounded w-1/3" />
              <div className="h-12 bg-surface-muted rounded w-full" />
              <div className="h-3 bg-surface-muted rounded w-1/4" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 text-center text-rose-400 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20">
          Failed to load memories from backend.
        </div>
      ) : memories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {memories.map((mem: Memory) => (
            <Card
              key={mem._id}
              className="p-4 flex flex-col justify-between space-y-3 shadow-card border-subtle group hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={getTypeBadgeVariant(mem.type)} size="sm">
                    {mem.type}
                  </Badge>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatMemoryDate(mem.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">
                  {mem.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-subtle text-[11px] text-slate-400">
                <span className="text-emerald-400/90 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                  Active Context
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(mem._id)}
                  title="Delete memory"
                  disabled={deleteMutation.isPending}
                  className="opacity-40 group-hover:opacity-100 hover:text-rose-400 text-slate-400 p-1 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${selectedType.toLowerCase()} memories captured yet`}
          description="Memories are automatically extracted in the background when you chat with NexaMind, or you can manually save one above."
        />
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <Card className="w-full max-w-md p-6 space-y-4 shadow-elevated border-white/[0.12] bg-[#12172a]/95 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <h2 className="text-sm font-display font-semibold text-white">Add Cognitive Memory</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Memory Category
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MemoryType)}
                  className="w-full rounded-xl bg-[#0e1220] border border-white/[0.10] px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="FACT">FACT (Information & Knowledge)</option>
                  <option value="PREFERENCE">PREFERENCE (User Habits & Style)</option>
                  <option value="GOAL">GOAL (Target Objectives)</option>
                  <option value="INSTRUCTION">INSTRUCTION (System Directives)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Memory Content
                </label>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g. User prefers concise responses with TypeScript examples..."
                  required
                  className="w-full rounded-xl bg-[#0e1220] border border-white/[0.10] px-3.5 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={createMutation.isPending}
                  disabled={createMutation.isPending || !newContent.trim()}
                >
                  Save Memory
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
