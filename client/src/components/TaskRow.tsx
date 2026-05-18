import { useState } from 'react';
import {
  Trash2, MessageSquare, Send, Plus, ChevronDown, ChevronRight,
  Calendar, UserCircle2, StickyNote,
} from 'lucide-react';
import { STATUS, STATUS_ORDER, fmtDeadline } from '../lib/status';
import type { Task, TaskStatus, UserRef } from '../types';
import { dialogConfirm, dialogPrompt } from './Modal';
import { useAuth } from '../lib/auth';

interface Props {
  task: Task;
  users: UserRef[];                         // for assignee picker
  depth?: number;                           // 0 = top-level, 1+ = subtask
  onChange: (id: string, patch: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddSubtask: (parentId: string, title: string) => Promise<void>;
  onCommentAdd: (taskId: string, content: string) => Promise<void>;
  onCommentDelete: (taskId: string, commentId: string) => Promise<void>;
}

export function TaskRow({
  task, users, depth = 0,
  onChange, onDelete, onAddSubtask, onCommentAdd, onCommentDelete,
}: Props) {
  const cfg = STATUS[task.status];
  const Icon = cfg.icon;
  const { user } = useAuth();

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [showDetails, setShowDetails] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [note, setNote] = useState(task.note ?? '');
  const [assigneeNote, setAssigneeNote] = useState(task.assigneeNote ?? '');
  const [newComment, setNewComment] = useState('');
  const [busyComment, setBusyComment] = useState(false);

  const completed = task.status === 'DONE' || task.status === 'CANCELLED';
  const deadline = fmtDeadline(task.deadline);
  const subtasks = task.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.status === 'DONE').length;

  const cycleStatus = async () => {
    const i = STATUS_ORDER.indexOf(task.status);
    const next = STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
    await onChange(task.id, { status: next });
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (title.trim() && title !== task.title) await onChange(task.id, { title: title.trim() });
    else setTitle(task.title);
  };

  const saveNote = async () => {
    if (note !== (task.note ?? '')) await onChange(task.id, { note: note || null });
  };
  const saveAssigneeNote = async () => {
    if (assigneeNote !== (task.assigneeNote ?? '')) {
      await onChange(task.id, { assigneeNote: assigneeNote || null });
    }
  };

  const setDeadline = async (d: string) => {
    await onChange(task.id, { deadline: d ? new Date(d + 'T23:59:59').toISOString() : null });
  };
  const setAssignee = async (id: string) => {
    await onChange(task.id, { assigneeId: id || null });
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setBusyComment(true);
    try {
      await onCommentAdd(task.id, newComment.trim());
      setNewComment('');
    } finally { setBusyComment(false); }
  };

  const handleDelete = async () => {
    const ok = await dialogConfirm(
      depth > 0 ? 'Delete this sub-task?' : 'Delete this task (and all its sub-tasks)?',
    );
    if (ok) await onDelete(task.id);
  };

  const handleAddSubtask = async () => {
    const t = await dialogPrompt('New sub-task', '', 'e.g. Review draft');
    if (t) await onAddSubtask(task.id, t);
  };

  const deadlineToneClass =
    deadline?.tone === 'past'
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : deadline?.tone === 'soon'
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        : 'bg-elev-2 text-muted border-base';

  return (
    <div className="animate-fadeIn">
      <div
        className="flex gap-2.5 p-2.5 rounded items-start border-l-2"
        style={{ borderLeftColor: cfg.hex, background: 'var(--bg-elev-1)' }}
      >
        {/* Status icon */}
        <button
          onClick={cycleStatus}
          className="w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            color: cfg.hex,
            borderColor: cfg.hex,
            background: `color-mix(in srgb, ${cfg.hex} 12%, transparent)`,
          }}
          title="Click to cycle status"
        >
          <Icon size={13} strokeWidth={2.5} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
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
                className="flex-1 min-w-0 input !py-1 text-sm"
                style={{ borderColor: 'var(--accent)' }}
              />
            ) : (
              <div
                className={`text-sm leading-snug cursor-text flex-1 min-w-0 ${
                  completed ? 'line-through opacity-55' : ''
                }`}
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
              </div>
            )}

            {/* Chips: deadline, assignee, subtasks, comments */}
            {deadline && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${deadlineToneClass}`}
                title={new Date(task.deadline!).toLocaleString()}
              >
                <Calendar size={9} /> {deadline.label}
              </span>
            )}
            {task.assignee && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: 'var(--bg-elev-2)', color: 'var(--accent)' }}
                title={`Assigned to ${task.assignee.name}`}
              >
                <UserCircle2 size={10} /> {task.assignee.name}
              </span>
            )}
            {subtasks.length > 0 && (
              <button
                onClick={() => setShowSubtasks((s) => !s)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted hover:text-accent"
                style={{ background: 'var(--bg-elev-2)' }}
              >
                {showSubtasks ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {subDone}/{subtasks.length}
              </button>
            )}
          </div>

          <div className="font-mono text-[9px] tracking-[0.15em] uppercase mt-1" style={{ color: cfg.hex }}>
            {cfg.label}
            {task.comments && task.comments.length > 0 && (
              <span className="ml-2 text-faint normal-case tracking-normal">
                · {task.comments.length} comment{task.comments.length > 1 ? 's' : ''}
              </span>
            )}
            {task.assigneeNote && (
              <span className="ml-2 text-faint normal-case tracking-normal">· has note</span>
            )}
          </div>

          {/* Details panel */}
          {showDetails && (
            <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Deadline</label>
                  <input
                    type="date"
                    className="input !py-1.5 text-xs"
                    value={task.deadline ? task.deadline.slice(0, 10) : ''}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Assignee</label>
                  <select
                    className="input !py-1.5 text-xs"
                    value={task.assigneeId ?? ''}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">— unassigned —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Note (issue / context)</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveNote}
                  placeholder="Issue details, context, links…"
                  className="input text-xs italic resize-y"
                />
              </div>

              <div>
                <label className="label">
                  <StickyNote size={9} className="inline mr-1" />
                  Assignee note {task.assignee && <span className="normal-case tracking-normal opacity-60">— for {task.assignee.name}</span>}
                </label>
                <textarea
                  rows={2}
                  value={assigneeNote}
                  onChange={(e) => setAssigneeNote(e.target.value)}
                  onBlur={saveAssigneeNote}
                  placeholder="Specific instructions for the assignee…"
                  className="input text-xs italic resize-y"
                />
              </div>
            </div>
          )}

          {/* Comments */}
          {showComments && (
            <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
              {(task.comments || []).map((c) => (
                <div key={c.id} className="group">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-serif italic text-sm text-accent">{c.author.name}</span>
                    <span className="font-mono text-[9px] text-faint">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                    {(c.author.id === user?.id || user?.role === 'ADMIN') && (
                      <button
                        onClick={async () => {
                          if (await dialogConfirm('Delete this comment?')) {
                            onCommentDelete(task.id, c.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 text-[10px] ml-auto"
                      >delete</button>
                    )}
                  </div>
                  <div className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-base)', opacity: 0.85 }}>
                    {c.content}
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  placeholder="Add a comment…"
                  className="input !py-1.5 text-xs"
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

        {/* Right-side actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <select
            value={task.status}
            onChange={(e) => onChange(task.id, { status: e.target.value as TaskStatus })}
            className="rounded px-1.5 py-1 text-[10px] font-mono"
            style={{
              background: 'var(--bg-elev-2)',
              color: 'var(--text-base)',
              border: '1px solid var(--border)',
            }}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS[s].label}</option>
            ))}
          </select>
          <button className="btn-mini" onClick={() => setShowDetails((s) => !s)} title="Details">
            <Calendar size={11} className={task.deadline || task.assignee ? 'text-accent' : ''} />
          </button>
          <button
            className="btn-mini"
            onClick={() => setShowComments((s) => !s)}
            title="Comments"
          >
            <MessageSquare size={11} className={task.comments?.length ? 'text-accent' : ''} />
          </button>
          {depth < 2 && (
            <button className="btn-mini" onClick={handleAddSubtask} title="Add sub-task">
              <Plus size={11} />
            </button>
          )}
          <button className="btn-mini hover:!text-red-400" onClick={handleDelete}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Recursive sub-tasks */}
      {showSubtasks && subtasks.length > 0 && (
        <div className="ml-6 mt-1.5 space-y-1.5 pl-3 border-l border-dashed" style={{ borderColor: 'var(--border)' }}>
          {subtasks.map((s) => (
            <TaskRow
              key={s.id}
              task={s}
              users={users}
              depth={depth + 1}
              onChange={onChange}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onCommentAdd={onCommentAdd}
              onCommentDelete={onCommentDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
