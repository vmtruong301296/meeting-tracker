import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Filter, Download, Calendar, X, TrendingUp,
  LogOut, FileText, FileSpreadsheet, Trash2, Sun, Moon,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { STATUS, STATUS_ORDER, fmtDate, todayInput, colorHex } from '../lib/status';
import type {
  Meeting, MeetingSummary, Task, TaskStatus, TaskComment, UserRef, GroupColor, MemberColor,
} from '../types';
import { GroupBlock } from '../components/GroupBlock';
import { ProgressRing } from '../components/ProgressRing';
import { Modal, dialogConfirm, dialogPrompt } from '../components/Modal';

export default function TrackerPage() {
  const { user, logout, theme, setTheme } = useAuth();

  const [list, setList] = useState<MeetingSummary[]>([]);
  const [current, setCurrent] = useState<Meeting | null>(null);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterGroup, setFilterGroup] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newDate, setNewDate] = useState(todayInput());
  const [carryOver, setCarryOver] = useState(true);

  // ---- Initial load ----
  const loadList = useCallback(async () => {
    const r = await api<{ meetings: MeetingSummary[] }>('/meetings');
    setList(r.meetings);
    return r.meetings;
  }, []);
  const loadMeeting = useCallback(async (id: string) => {
    const r = await api<{ meeting: Meeting }>(`/meetings/${id}`);
    setCurrent(r.meeting);
  }, []);
  const loadUsers = useCallback(async () => {
    try {
      const r = await api<{ users: UserRef[] }>('/users');
      setUsers(r.users);
    } catch { /* member may not have access — ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadUsers();
        const meetings = await loadList();
        if (meetings.length > 0) await loadMeeting(meetings[0].id);
      } finally { setLoading(false); }
    })();
  }, [loadList, loadMeeting, loadUsers]);

  const refresh = async () => { if (current) await loadMeeting(current.id); };

  // ---- Mutations ----
  const createMeeting = async () => {
    const { meeting } = await api<{ meeting: Meeting }>('/meetings', {
      method: 'POST',
      body: {
        date: newDate,
        ...(carryOver && current ? { carryOverFromId: current.id } : {}),
      },
    });
    await loadList();
    setCurrent(meeting);
    setShowNew(false);
  };

  const switchMeeting = async (id: string) => {
    await loadMeeting(id);
    setShowHistory(false);
  };

  const deleteMeeting = async (id: string) => {
    if (!(await dialogConfirm('Delete this meeting permanently?'))) return;
    await api(`/meetings/${id}`, { method: 'DELETE' });
    const meetings = await loadList();
    if (current?.id === id) {
      if (meetings.length > 0) await loadMeeting(meetings[0].id);
      else setCurrent(null);
    }
  };

  const addGroup = async () => {
    if (!current) return;
    const name = await dialogPrompt('New group name', '', 'e.g. Nhóm Marketing');
    if (!name) return;
    await api('/groups', { method: 'POST', body: { meetingId: current.id, name } });
    await refresh();
  };

  const actions = {
    renameGroup: async (id: string, name: string) => {
      await api(`/groups/${id}`, { method: 'PATCH', body: { name } }); await refresh();
    },
    setGroupColor: async (id: string, color: GroupColor) => {
      await api(`/groups/${id}`, { method: 'PATCH', body: { color } }); await refresh();
    },
    deleteGroup: async (id: string) => {
      await api(`/groups/${id}`, { method: 'DELETE' }); await refresh();
    },
    toggleGroup: async (id: string) => {
      const g = current?.groups.find((x) => x.id === id);
      if (!g) return;
      await api(`/groups/${id}`, { method: 'PATCH', body: { collapsed: !g.collapsed } });
      await refresh();
    },
    addMember: async (gid: string, name: string) => {
      await api('/members', { method: 'POST', body: { groupId: gid, name } }); await refresh();
    },
    renameMember: async (id: string, name: string) => {
      await api(`/members/${id}`, { method: 'PATCH', body: { name } }); await refresh();
    },
    setMemberColor: async (id: string, color: MemberColor) => {
      await api(`/members/${id}`, { method: 'PATCH', body: { color } }); await refresh();
    },
    deleteMember: async (id: string) => {
      await api(`/members/${id}`, { method: 'DELETE' }); await refresh();
    },
    addTask: async (mid: string, title: string) => {
      await api('/tasks', { method: 'POST', body: { memberId: mid, title } }); await refresh();
    },
    addSubtask: async (parentId: string, title: string) => {
      // need memberId from parent task → find it in current tree
      const findTask = (tasks: Task[]): Task | null => {
        for (const t of tasks) {
          if (t.id === parentId) return t;
          if (t.subtasks) {
            const found = findTask(t.subtasks);
            if (found) return found;
          }
        }
        return null;
      };
      const allTasks = current?.groups.flatMap((g) => g.members.flatMap((m) => m.tasks)) || [];
      const parent = findTask(allTasks);
      if (!parent) return;
      await api('/tasks', {
        method: 'POST',
        body: { memberId: parent.memberId, parentId, title },
      });
      await refresh();
    },
    updateTask: async (id: string, patch: Partial<Task>) => {
      await api(`/tasks/${id}`, { method: 'PATCH', body: patch }); await refresh();
    },
    deleteTask: async (id: string) => {
      await api(`/tasks/${id}`, { method: 'DELETE' }); await refresh();
    },
    addComment: async (tid: string, content: string) => {
      await api<{ comment: TaskComment }>(`/tasks/${tid}/comments`, {
        method: 'POST', body: { content },
      });
      await refresh();
    },
    deleteComment: async (_tid: string, cid: string) => {
      await api(`/tasks/comments/${cid}`, { method: 'DELETE' }); await refresh();
    },
  };

  // ---- Filtering & stats ----
  const flattenTasks = (tasks: Task[]): Task[] =>
    tasks.flatMap((t) => [t, ...(t.subtasks ? flattenTasks(t.subtasks) : [])]);

  const filteredGroups = useMemo(() => {
    if (!current) return [];
    return current.groups
      .filter((g) => filterGroup === 'all' || g.id === filterGroup)
      .map((g) => ({
        ...g,
        members: g.members
          .filter((m) => filterMember === 'all' || m.id === filterMember)
          .map((m) => ({
            ...m,
            tasks: m.tasks.filter((t) => filterStatus === 'all' || t.status === filterStatus),
          })),
      }));
  }, [current, filterGroup, filterMember, filterStatus]);

  const memberOptions = useMemo(() => {
    if (!current) return [];
    if (filterGroup === 'all')
      return current.groups.flatMap((g) =>
        g.members.map((m) => ({ id: m.id, label: `${g.name} • ${m.name}` })),
      );
    const g = current.groups.find((x) => x.id === filterGroup);
    return g ? g.members.map((m) => ({ id: m.id, label: m.name })) : [];
  }, [current, filterGroup]);

  const stats = useMemo(() => {
    if (!current) return null;
    const all = flattenTasks(
      current.groups.flatMap((g) => g.members.flatMap((m) => m.tasks)),
    );
    const counts = STATUS_ORDER.reduce(
      (a, s) => ((a[s] = all.filter((t) => t.status === s).length), a),
      {} as Record<TaskStatus, number>,
    );
    const active = all.length - counts.CANCELLED;
    const overall = active > 0 ? Math.round((counts.DONE / active) * 100) : 0;

    const perGroup = current.groups.map((g) => {
      const tasks = flattenTasks(g.members.flatMap((m) => m.tasks));
      const c = STATUS_ORDER.reduce(
        (a, s) => ((a[s] = tasks.filter((t) => t.status === s).length), a),
        {} as Record<TaskStatus, number>,
      );
      const a = tasks.length - c.CANCELLED;
      const pct = a > 0 ? Math.round((c.DONE / a) * 100) : 0;
      return { name: g.name, color: g.color, total: tasks.length, counts: c, pct };
    });

    return { counts, overall, perGroup, total: all.length };
  }, [current]);

  // ---- Export ----
  const download = (name: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };
  const exportMd = () => {
    if (!current) return;
    let md = `# Meeting — ${fmtDate(current.date)}\n\n`;
    const renderTask = (t: Task, depth: number): string => {
      const indent = '  '.repeat(depth);
      const box = t.status === 'DONE' ? '[x]' : '[ ]';
      let line = `${indent}- ${box} **${STATUS[t.status].label}** — ${t.title}`;
      if (t.deadline) line += ` _(due ${t.deadline.slice(0, 10)})_`;
      if (t.assignee) line += ` _→ ${t.assignee.name}_`;
      line += '\n';
      if (t.note) line += `${indent}  - 📝 ${t.note}\n`;
      if (t.assigneeNote) line += `${indent}  - 📌 ${t.assigneeNote}\n`;
      if (t.subtasks) for (const s of t.subtasks) line += renderTask(s, depth + 1);
      return line;
    };
    for (const g of current.groups) {
      md += `## ${g.name}\n\n`;
      for (const m of g.members) {
        md += `### ${m.name}\n`;
        for (const t of m.tasks) md += renderTask(t, 0);
        md += '\n';
      }
    }
    download(`meeting-${current.date.slice(0, 10)}.md`, md, 'text/markdown');
  };
  const exportCsv = (allMeetings = false) => {
    const rows = [['Date', 'Group', 'Member', 'Task', 'Status', 'Deadline', 'Assignee', 'Note']];
    const addTask = (date: string, gn: string, mn: string, t: Task, prefix: string = '') => {
      rows.push([
        date, gn, mn, prefix + t.title, STATUS[t.status].label,
        t.deadline ? t.deadline.slice(0, 10) : '',
        t.assignee?.name || '',
        t.note || '',
      ]);
      if (t.subtasks) for (const s of t.subtasks) addTask(date, gn, mn, s, prefix + '↳ ');
    };
    const add = (m: Meeting) => {
      for (const g of m.groups)
        for (const mem of g.members)
          for (const t of mem.tasks)
            addTask(m.date.slice(0, 10), g.name, mem.name, t);
    };
    if (allMeetings) {
      Promise.all(list.map((s) => api<{ meeting: Meeting }>(`/meetings/${s.id}`)))
        .then((all) => {
          all.forEach((r) => add(r.meeting));
          const csv = rows
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n');
          download('all-meetings.csv', csv, 'text/csv');
        });
    } else if (current) {
      add(current);
      const csv = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      download(`meeting-${current.date.slice(0, 10)}.csv`, csv, 'text/csv');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-accent font-mono text-sm">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="min-h-full pb-20">
      {/* ===== Header ===== */}
      <header className="flex flex-wrap items-end justify-between gap-4 px-10 pt-8 pb-6 border-b border-subtle">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] uppercase text-accent">
            <span>03</span>
            <span className="opacity-50">/</span>
            <span className="text-muted">weekly meets</span>
          </div>
          <h1 className="font-serif text-[38px] font-normal tracking-tight leading-none m-0">
            <span className="italic text-accent">Meeting</span> Tracker
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted mr-2 hidden sm:inline">
            {user?.name} <span className="font-mono text-[10px] text-accent ml-1">{user?.role}</span>
          </span>
          <button
            className="btn-ghost"
            onClick={() => setTheme(theme === 'DARK' ? 'LIGHT' : 'DARK')}
            title={`Switch to ${theme === 'DARK' ? 'light' : 'dark'} theme`}
          >
            {theme === 'DARK' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button className="btn-ghost" onClick={() => setShowStats((s) => !s)} title="Stats">
            <TrendingUp size={14} />
          </button>
          <button className="btn-ghost" onClick={() => setShowHistory((s) => !s)} title="History">
            <Calendar size={14} />
          </button>
          <button className="btn-ghost" onClick={() => setShowExport(true)} title="Export">
            <Download size={14} />
          </button>
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New meeting
          </button>
          <button className="btn-ghost" onClick={logout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ===== Sub-header ===== */}
      {current && (
        <div className="flex flex-wrap justify-between items-center px-10 py-5 gap-4 border-b border-subtle">
          <div>
            <div className="label !mb-1">currently viewing</div>
            <div className="font-serif text-[22px] italic">{fmtDate(current.date)}</div>
          </div>
          {stats && (
            <div className="flex items-center gap-3">
              <ProgressRing pct={stats.overall} />
              <div>
                <div className="label !mb-1">overall progress</div>
                <div className="font-serif text-[22px] text-accent">
                  {stats.overall}%{' '}
                  <span className="text-xs italic text-muted">
                    · {stats.counts.DONE}/{stats.total - stats.counts.CANCELLED} tasks
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Filters ===== */}
      {current && (
        <div className="flex flex-wrap items-center gap-2.5 px-10 py-3.5 bg-elev-1 border-b border-subtle">
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="opacity-50" />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-50">filter</span>
          </div>
          <select
            value={filterGroup}
            onChange={(e) => { setFilterGroup(e.target.value); setFilterMember('all'); }}
            className="input !py-1.5 !w-auto text-xs"
          >
            <option value="all">All groups</option>
            {current.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="input !py-1.5 !w-auto text-xs"
          >
            <option value="all">All members</option>
            {memberOptions.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
            className="input !py-1.5 !w-auto text-xs"
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
          {(filterGroup !== 'all' || filterMember !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => { setFilterGroup('all'); setFilterMember('all'); setFilterStatus('all'); }}
              className="text-muted text-xs flex items-center gap-1 px-2 py-1"
            >
              <X size={11} /> clear
            </button>
          )}
        </div>
      )}

      {/* ===== Stats panel ===== */}
      {showStats && stats && (
        <div className="px-10 py-5 border-b border-subtle animate-fadeIn"
             style={{ background: 'color-mix(in srgb, var(--accent) 4%, transparent)' }}>
          <div className="label !mb-3.5">Group breakdown</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {stats.perGroup.map((g) => {
              const hex = colorHex(g.color);
              return (
                <div key={g.name} className="p-3.5 card" style={{ borderLeft: `3px solid ${hex}` }}>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-serif text-base">{g.name}</span>
                    <span className="font-serif italic" style={{ color: hex }}>{g.pct}%</span>
                  </div>
                  <div className="h-[3px] rounded mb-2.5 overflow-hidden bg-elev-2">
                    <div
                      className="h-full"
                      style={{ width: `${g.pct}%`, background: hex, transition: 'width 0.5s' }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_ORDER.map((s) =>
                      g.counts[s] ? (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border"
                          style={{
                            color: STATUS[s].hex,
                            background: `color-mix(in srgb, ${STATUS[s].hex} 12%, transparent)`,
                            borderColor: `color-mix(in srgb, ${STATUS[s].hex} 30%, transparent)`,
                          }}
                        >
                          {g.counts[s]} {STATUS[s].label}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Main tree ===== */}
      <main className="px-10 py-6 flex flex-col gap-4 max-w-[1200px] mx-auto">
        {!current && (
          <div className="flex flex-col items-center gap-6 py-20 text-muted">
            <div className="font-serif text-[28px] italic">No meetings yet</div>
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              <Plus size={14} /> Create the first one
            </button>
          </div>
        )}

        {filteredGroups.map((g) => (
          <GroupBlock key={g.id} group={g} users={users} actions={actions} />
        ))}

        {current && (
          <button
            onClick={addGroup}
            className="border border-dashed italic text-sm rounded p-3.5 transition hover:bg-elev-1"
            style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)', color: 'var(--accent)' }}
          >
            <Plus size={14} className="inline mr-1" /> Add group
          </button>
        )}
      </main>

      {/* ===== Modals ===== */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New meeting">
        <div className="space-y-4">
          <div>
            <label className="label">Date</label>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input" />
          </div>
          {current && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={carryOver} onChange={(e) => setCarryOver(e.target.checked)} />
              <span>Carry over unfinished tasks from <em>{fmtDate(current.date)}</em></span>
            </label>
          )}
          <button className="btn-primary w-full justify-center py-2.5" onClick={createMeeting}>
            <Plus size={14} /> Create
          </button>
        </div>
      </Modal>

      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Meeting history">
        <div className="space-y-1.5">
          {list.length === 0 && <div className="opacity-60 text-sm">No history yet.</div>}
          {list.map((m) => {
            const active = m.id === current?.id;
            return (
              <div
                key={m.id}
                className="flex items-center gap-2.5 p-3 rounded border"
                style={{
                  borderColor: active ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border-subtle)',
                  background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-elev-1)',
                }}
              >
                <div className="flex-1 cursor-pointer" onClick={() => switchMeeting(m.id)}>
                  <div className="font-serif italic text-[15px]">{fmtDate(m.date)}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {m._count.groups} groups · by {m.owner.name}
                  </div>
                </div>
                <button
                  className="p-1.5 border border-red-400/20 text-red-400 rounded hover:bg-red-400/5"
                  onClick={() => deleteMeeting(m.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export report">
        <div className="flex flex-col gap-2.5">
          <button
            className="flex items-center gap-2.5 p-3 card text-sm hover:bg-elev-2"
            onClick={() => { exportMd(); setShowExport(false); }}
          >
            <FileText size={16} /> Current meeting → Markdown
          </button>
          <button
            className="flex items-center gap-2.5 p-3 card text-sm hover:bg-elev-2"
            onClick={() => { exportCsv(false); setShowExport(false); }}
          >
            <FileSpreadsheet size={16} /> Current meeting → CSV (Excel)
          </button>
          <button
            className="flex items-center gap-2.5 p-3 card text-sm hover:bg-elev-2"
            onClick={() => { exportCsv(true); setShowExport(false); }}
          >
            <FileSpreadsheet size={16} /> All meetings → CSV
          </button>
          <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
            CSV opens in Excel directly. For PDF, open Markdown in VSCode/Typora and print-to-PDF.
          </p>
        </div>
      </Modal>
    </div>
  );
}
