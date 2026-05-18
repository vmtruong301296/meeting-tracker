import { useState } from 'react';
import { Trash2, MessageSquare, Send } from 'lucide-react';
import { STATUS, STATUS_ORDER } from '../lib/status';
import type { Task, TaskStatus } from '../types';
import { api } from '../lib/api';
import { dialogConfirm } from './Modal';
import { useAuth } from '../lib/auth';

interface Props {
  task: Task;
  onChange: (patch: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
  onCommentAdd: (taskId: string, content: string) => Promise<void>;
  onCommentDelete: (taskId: string, commentId: string) => Promise<void>;
}

export function TaskRow({ task, onChange, onDelete, onCommentAdd, onCommentDelete }: Props) {
  const cfg = STATUS[task.status];
  const Icon = cfg.icon;
  const { user } = useAuth();

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [showNote, setShowNote] = useState(!!task.note);
  const [note, setNote] = useState(task.note ?? '');
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [busyComment, setBusyComment] = useState(false);

  const completed = task.status === 'DONE' || task.status === 'CANCELLED';

  const cycleStatus = async () => {
    const i = STATUS_ORDER.indexOf(task.status);
    const next = STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
    await onChange({ status: next });
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (title.trim() && title !== task.title) await onChange({ title: title.trim() });
    else setTitle(task.title);
  };

  const saveNote = async () => {
    if (note !== (task.note ?? '')) await onChange({ note: note || null });
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setBusyComment(true);
    try {
      await onCommentAdd(task.id, newComment.trim());
      setNewComment('');
    } finally {
      setBusyComment(false);
    }
  };

  const handleDelete = async () => {
    const ok = await dialogConfirm('Delete this task?');
    if (ok) await onDelete();
  };

  const handleDeleteComment = async (cid: string) => {
    const ok = await dialogConfirm('Delete this comment?');
    if (ok) await onCommentDelete(task.id, cid);
  };

  return (
    <div
      className="flex gap-2.5 p-2.5 bg-white/[0.025] rounded border-l-2 items-start"
      style={{ borderLeftColor: cfg.hex }}
    >
      <button
        onClick={cycleStatus}
        className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.text} ${cfg.bg}`}
        style={{ borderColor: cfg.hex }}
        title="Click to cycle status"
      >
        <Icon size={13} strokeWidth={2.5} />
      </button>

      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') { setTitle(task.title); setEditingTitle(false); }
            }}
            className="w-full bg-black/30 border border-amber-gold/40 rounded px-2 py-1 text-sm"
          />
        ) : (
          <div
            className={`text-sm leading-snug cursor-text ${completed ? 'line-through opacity-55' : ''}`}
            onClick={() => setEditingTitle(true)}
          >
            {task.title}
          </div>
        )}

        <div className={`font-mono text-[9px] tracking-[0.15em] uppercase mt-1 ${cfg.text}`}>
          {cfg.label}
          {task.comments && task.comments.length > 0 && (
            <span className="ml-2 text-cream-100/40 normal-case tracking-normal">
              · {task.comments.length} comment{task.comments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {showNote && (
          <textarea
            placeholder="Note / issue details…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            rows={2}
            className="w-full mt-2 bg-black/25 border border-white/10 rounded p-2 text-xs italic resize-y"
          />
        )}

        {showComments && (
          <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
            {(task.comments || []).map((c) => (
              <div key={c.id} className="group">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-serif italic text-sm text-amber-gold">{c.author.name}</span>
                  <span className="font-mono text-[9px] text-cream-100/40">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                  {(c.author.id === user?.id || user?.role === 'ADMIN') && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 text-[10px] ml-auto"
                    >
                      delete
                    </button>
                  )}
                </div>
                <div className="text-xs text-cream-100/85 whitespace-pre-wrap">{c.content}</div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                placeholder="Add a comment…"
                className="flex-1 bg-black/25 border border-white/10 rounded px-2.5 py-1.5 text-xs"
              />
              <button
                onClick={submitComment}
                disabled={busyComment || !newComment.trim()}
                className="btn-mini disabled:opacity-30"
                title="Send"
              >
                <Send size={11} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <select
          value={task.status}
          onChange={(e) => onChange({ status: e.target.value as TaskStatus })}
          className="bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[10px] font-mono"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS[s].label}</option>
          ))}
        </select>
        <button className="btn-mini" onClick={() => setShowNote((s) => !s)} title="Note">
          <MessageSquare size={11} className={task.note ? 'text-red-400' : ''} />
        </button>
        <button className="btn-mini" onClick={() => setShowComments((s) => !s)} title="Comments">
          <MessageSquare size={11} className="text-amber-gold" />
        </button>
        <button className="btn-mini hover:text-red-400" onClick={handleDelete}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
