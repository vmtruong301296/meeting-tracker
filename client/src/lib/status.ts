import { Check, Circle, Clock, AlertTriangle, Ban, type LucideIcon } from 'lucide-react';
import type { TaskStatus, GroupColor } from '../types';

export interface StatusCfg {
  label: string;
  icon: LucideIcon;
  hex: string;
}

export const STATUS: Record<TaskStatus, StatusCfg> = {
  TODO:        { label: 'To-do',       icon: Circle,        hex: '#9ca3af' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock,         hex: '#f59e0b' },
  DONE:        { label: 'Done',        icon: Check,         hex: '#10b981' },
  ISSUE:       { label: 'Issue',       icon: AlertTriangle, hex: '#ef4444' },
  CANCELLED:   { label: 'Cancelled',   icon: Ban,           hex: '#6b7280' },
};

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'ISSUE', 'CANCELLED'];

// ---- Group colors ----
export const GROUP_COLORS: { key: GroupColor; label: string; hex: string }[] = [
  { key: 'amber',   label: 'Amber',   hex: '#d4a574' },
  { key: 'rose',    label: 'Rose',    hex: '#e25563' },
  { key: 'emerald', label: 'Emerald', hex: '#10b981' },
  { key: 'sky',     label: 'Sky',     hex: '#38bdf8' },
  { key: 'violet',  label: 'Violet',  hex: '#a78bfa' },
  { key: 'slate',   label: 'Slate',   hex: '#94a3b8' },
];

export const colorHex = (c: GroupColor) =>
  GROUP_COLORS.find((x) => x.key === c)?.hex || '#d4a574';

// ---- Date helpers ----
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const fmtDeadline = (iso: string | null): { label: string; tone: 'past' | 'soon' | 'normal' } | null => {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const sameYear = due.getFullYear() === now.getFullYear();
  const dateStr = due.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });

  let label = dateStr;
  if (diffDays === 0) label = `Today`;
  else if (diffDays === 1) label = `Tomorrow`;
  else if (diffDays === -1) label = `Yesterday`;
  else if (diffDays < 0) label = `${Math.abs(diffDays)}d overdue`;
  else if (diffDays <= 7) label = `in ${diffDays}d`;

  const tone: 'past' | 'soon' | 'normal' =
    diffDays < 0 ? 'past' : diffDays <= 2 ? 'soon' : 'normal';

  return { label, tone };
};

export const toDateInput = (iso: string) => iso.slice(0, 10);
export const todayInput = () => new Date().toISOString().slice(0, 10);

// Convert ISO date (yyyy-mm-dd) → full ISO with midnight UTC, for API
export const dateInputToIso = (d: string | null): string | null =>
  d ? new Date(d + 'T23:59:59').toISOString() : null;
