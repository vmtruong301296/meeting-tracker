import { Plus, Edit3, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { TaskRow } from './TaskRow';
import { dialogConfirm, dialogPrompt } from './Modal';
import type { Group, Member, Task } from '../types';

interface GroupActions {
  renameGroup: (gid: string, name: string) => Promise<void>;
  deleteGroup: (gid: string) => Promise<void>;
  toggleGroup: (gid: string) => Promise<void>;
  addMember: (gid: string, name: string) => Promise<void>;
  renameMember: (mid: string, name: string) => Promise<void>;
  deleteMember: (mid: string) => Promise<void>;
  addTask: (mid: string, title: string) => Promise<void>;
  updateTask: (tid: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (tid: string) => Promise<void>;
  addComment: (tid: string, content: string) => Promise<void>;
  deleteComment: (tid: string, cid: string) => Promise<void>;
}

export function GroupBlock({ group, actions }: { group: Group; actions: GroupActions }) {
  const taskCount = group.members.reduce((a, m) => a + m.tasks.length, 0);

  const onRename = async () => {
    const n = await dialogPrompt('Rename group', group.name);
    if (n) actions.renameGroup(group.id, n);
  };
  const onDelete = async () => {
    if (await dialogConfirm('Delete this group and all its members & tasks?')) actions.deleteGroup(group.id);
  };
  const onAddMember = async () => {
    const n = await dialogPrompt('New member name', '', 'e.g. Nguyễn Văn A');
    if (n) actions.addMember(group.id, n);
  };

  return (
    <section className="card overflow-hidden animate-fadeIn">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <button onClick={() => actions.toggleGroup(group.id)} className="text-amber-gold">
          {group.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <h2 className="font-serif text-xl tracking-tight">{group.name}</h2>
        <span className="font-mono text-[10px] tracking-wider uppercase text-cream-100/40">
          {group.members.length} members · {taskCount} tasks
        </span>
        <div className="ml-auto flex gap-1">
          <button className="btn-mini" onClick={onRename}><Edit3 size={12} /></button>
          <button className="btn-mini" onClick={onAddMember} title="Add member"><Plus size={12} /></button>
          <button className="btn-mini hover:text-red-400" onClick={onDelete}><Trash2 size={12} /></button>
        </div>
      </div>

      {!group.collapsed && (
        <div className="px-4 pb-4 pt-2">
          {group.members.map((m) => (
            <MemberBlock key={m.id} member={m} actions={actions} />
          ))}
          {group.members.length === 0 && (
            <div className="py-3 flex items-center gap-2 text-xs italic text-cream-100/40">
              <span>No members yet</span>
              <button className="text-amber-gold underline italic" onClick={onAddMember}>
                + add one
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MemberBlock({ member, actions }: { member: Member; actions: GroupActions }) {
  const done = member.tasks.filter((t) => t.status === 'DONE').length;

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
    <div className="py-3 border-b border-dashed border-white/5 last:border-0">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-gold to-amber-deep
                        text-ink-950 flex items-center justify-center font-serif italic font-semibold text-xs">
          {member.name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="font-medium text-sm">{member.name}</div>
        <span className="font-mono text-[10px] text-cream-100/50 bg-white/5 px-1.5 py-0.5 rounded">
          {done}/{member.tasks.length}
        </span>
        <div className="ml-auto flex gap-0.5">
          <button className="btn-mini" onClick={onRename}><Edit3 size={11} /></button>
          <button className="btn-mini" onClick={onAddTask} title="Add task"><Plus size={11} /></button>
          <button className="btn-mini hover:text-red-400" onClick={onDelete}><Trash2 size={11} /></button>
        </div>
      </div>

      <div className="pl-9 space-y-1.5">
        {member.tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onChange={(patch) => actions.updateTask(t.id, patch)}
            onDelete={() => actions.deleteTask(t.id)}
            onCommentAdd={(tid, c) => actions.addComment(tid, c)}
            onCommentDelete={(tid, cid) => actions.deleteComment(tid, cid)}
          />
        ))}
        {member.tasks.length === 0 && (
          <div className="py-1.5 flex items-center gap-2 text-xs italic text-cream-100/35">
            <span>No tasks</span>
            <button className="text-amber-gold underline italic" onClick={onAddTask}>+ add</button>
          </div>
        )}
      </div>
    </div>
  );
}
