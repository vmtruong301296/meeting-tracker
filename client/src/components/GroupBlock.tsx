import { useState } from 'react';
import { Plus, Edit3, Trash2, ChevronDown, ChevronRight, Palette } from 'lucide-react';
import { TaskRow } from './TaskRow';
import { dialogConfirm, dialogPrompt } from './Modal';
import { GROUP_COLORS, colorHex } from '../lib/status';
import type { Group, Member, Task, UserRef, GroupColor } from '../types';

interface GroupActions {
  renameGroup: (gid: string, name: string) => Promise<void>;
  setGroupColor: (gid: string, color: GroupColor) => Promise<void>;
  deleteGroup: (gid: string) => Promise<void>;
  toggleGroup: (gid: string) => Promise<void>;
  addMember: (gid: string, name: string) => Promise<void>;
  renameMember: (mid: string, name: string) => Promise<void>;
  deleteMember: (mid: string) => Promise<void>;
  addTask: (mid: string, title: string) => Promise<void>;
  addSubtask: (parentId: string, title: string) => Promise<void>;
  updateTask: (tid: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (tid: string) => Promise<void>;
  addComment: (tid: string, content: string) => Promise<void>;
  deleteComment: (tid: string, cid: string) => Promise<void>;
}

export function GroupBlock({
  group, users, actions,
}: { group: Group; users: UserRef[]; actions: GroupActions }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const taskCount = group.members.reduce(
    (a, m) => a + m.tasks.length + m.tasks.reduce((b, t) => b + (t.subtasks?.length || 0), 0),
    0,
  );
  const hex = colorHex(group.color);

  const onRename = async () => {
    const n = await dialogPrompt('Rename group', group.name);
    if (n) actions.renameGroup(group.id, n);
  };
  const onDelete = async () => {
    if (await dialogConfirm('Delete this group and all its members & tasks?')) {
      actions.deleteGroup(group.id);
    }
  };
  const onAddMember = async () => {
    const n = await dialogPrompt('New member name', '', 'e.g. Nguyễn Văn A');
    if (n) actions.addMember(group.id, n);
  };

  return (
    <section
      className={`card overflow-hidden animate-fadeIn gc-${group.color}`}
      style={{ borderLeftWidth: 3, borderLeftColor: hex }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-subtle bg-elev-1">
        <button onClick={() => actions.toggleGroup(group.id)} style={{ color: hex }}>
          {group.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <h2 className="font-serif text-xl tracking-tight">{group.name}</h2>
        <span className="font-mono text-[10px] tracking-wider uppercase text-faint">
          {group.members.length} members · {taskCount} tasks
        </span>
        <div className="ml-auto flex gap-1 relative">
          <button
            className="btn-mini"
            onClick={() => setPickerOpen((s) => !s)}
            title="Color"
            style={{ color: hex }}
          >
            <Palette size={12} />
          </button>
          {pickerOpen && (
            <div
              className="absolute right-0 top-full mt-1 p-2 rounded border border-base shadow-lg z-10 flex gap-1.5 bg-modal"
            >
              {GROUP_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={async () => {
                    await actions.setGroupColor(group.id, c.key);
                    setPickerOpen(false);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    group.color === c.key ? 'scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    background: c.hex,
                    borderColor: group.color === c.key ? c.hex : 'transparent',
                    boxShadow: group.color === c.key ? `0 0 0 2px var(--bg-base)` : 'none',
                  }}
                  title={c.label}
                />
              ))}
            </div>
          )}
          <button className="btn-mini" onClick={onRename}><Edit3 size={12} /></button>
          <button className="btn-mini" onClick={onAddMember} title="Add member"><Plus size={12} /></button>
          <button className="btn-mini hover:!text-red-400" onClick={onDelete}><Trash2 size={12} /></button>
        </div>
      </div>

      {!group.collapsed && (
        <div className="px-4 pb-4 pt-2">
          {group.members.map((m) => (
            <MemberBlock key={m.id} member={m} users={users} actions={actions} />
          ))}
          {group.members.length === 0 && (
            <div className="py-3 flex items-center gap-2 text-xs italic text-faint">
              <span>No members yet</span>
              <button
                className="underline italic"
                style={{ color: 'var(--accent)' }}
                onClick={onAddMember}
              >
                + add one
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MemberBlock({
  member, users, actions,
}: { member: Member; users: UserRef[]; actions: GroupActions }) {
  const allTasks = [
    ...member.tasks,
    ...member.tasks.flatMap((t) => t.subtasks ?? []),
  ];
  const done = allTasks.filter((t) => t.status === 'DONE').length;

  const onRename = async () => {
    const n = await dialogPrompt('Rename member', member.name);
    if (n) actions.renameMember(member.id, n);
  };
  const onDelete = async () => {
    if (await dialogConfirm('Delete this member?')) actions.deleteMember(member.id);
  };
  const onAddTask = async () => {
    const t = await dialogPrompt('New task', '', 'e.g. Review PR #123');
    if (t) actions.addTask(member.id, t);
  };

  return (
    <div className="py-3 border-b border-dashed border-subtle last:border-0">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center font-serif italic font-semibold text-xs"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%)',
            color: 'var(--accent-on)',
          }}
        >
          {member.name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="font-medium text-sm">{member.name}</div>
        <span
          className="font-mono text-[10px] text-muted px-1.5 py-0.5 rounded"
          style={{ background: 'var(--bg-elev-2)' }}
        >
          {done}/{allTasks.length}
        </span>
        <div className="ml-auto flex gap-0.5">
          <button className="btn-mini" onClick={onRename}><Edit3 size={11} /></button>
          <button className="btn-mini" onClick={onAddTask} title="Add task"><Plus size={11} /></button>
          <button className="btn-mini hover:!text-red-400" onClick={onDelete}><Trash2 size={11} /></button>
        </div>
      </div>

      <div className="pl-9 space-y-1.5">
        {member.tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            users={users}
            onChange={(tid, patch) => actions.updateTask(tid, patch)}
            onDelete={(tid) => actions.deleteTask(tid)}
            onAddSubtask={(pid, title) => actions.addSubtask(pid, title)}
            onCommentAdd={(tid, c) => actions.addComment(tid, c)}
            onCommentDelete={(tid, cid) => actions.deleteComment(tid, cid)}
          />
        ))}
        {member.tasks.length === 0 && (
          <div className="py-1.5 flex items-center gap-2 text-xs italic text-faint">
            <span>No tasks</span>
            <button
              className="underline italic"
              style={{ color: 'var(--accent)' }}
              onClick={onAddTask}
            >
              + add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
