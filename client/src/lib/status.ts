import { Check, Circle, Clock, AlertTriangle, Ban, type LucideIcon } from 'lucide-react';
import type { TaskStatus } from '../types';

export interface StatusCfg {
  label: string;
  icon: LucideIcon;
  text: string;       // tailwind text color class
  bg: string;         // tailwind bg color class
  border: string;     // tailwind border color class
  hex: string;        // raw color for SVG / inline use
}

export const STATUS: Record<TaskStatus, StatusCfg> = {
  TODO:        { label: 'To-do',       icon: Circle,        text: 'text-gray-400', bg: 'bg-gray-400/10',   border: 'border-gray-400', hex: '#9ca3af' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock,         text: 'text-amber-400', bg: 'bg-amber-400/10',  border: 'border-amber-400', hex: '#f59e0b' },
  DONE:        { label: 'Done',        icon: Check,         text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400', hex: '#10b981' },
  ISSUE:       { label: 'Issue',       icon: AlertTriangle, text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400', hex: '#ef4444' },
  CANCELLED:   { label: 'Cancelled',   icon: Ban,           text: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500', hex: '#6b7280' },
};

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'ISSUE', 'CANCELLED'];

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

export const toDateInput = (iso: string) => iso.slice(0, 10);
export const todayInput = () => new Date().toISOString().slice(0, 10);
