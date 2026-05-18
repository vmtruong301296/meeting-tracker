export type Role = 'ADMIN' | 'MEMBER';
export type Theme = 'DARK' | 'LIGHT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ISSUE' | 'CANCELLED';
export type GroupColor = 'amber' | 'rose' | 'emerald' | 'sky' | 'violet' | 'slate';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  theme?: Theme;
}

export interface UserRef { id: string; name: string }

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  author: UserRef;
}

export interface Task {
  id: string;
  title: string;
  note: string | null;
  status: TaskStatus;
  position: number;
  memberId: string;
  parentId: string | null;
  assigneeId: string | null;
  assignee: UserRef | null;
  assigneeNote: string | null;
  deadline: string | null;  // ISO datetime or null
  subtasks?: Task[];
  comments?: TaskComment[];
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  position: number;
  groupId: string;
  userId: string | null;
  user?: UserRef | null;
  tasks: Task[];
}

export interface Group {
  id: string;
  name: string;
  color: GroupColor;
  position: number;
  collapsed: boolean;
  meetingId: string;
  members: Member[];
}

export interface MeetingSummary {
  id: string;
  date: string;
  title: string | null;
  ownerId: string;
  owner: UserRef;
  createdAt: string;
  _count: { groups: number };
}

export interface Meeting {
  id: string;
  date: string;
  title: string | null;
  ownerId: string;
  createdAt: string;
  groups: Group[];
}
