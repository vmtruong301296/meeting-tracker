export type Role = 'ADMIN' | 'MEMBER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ISSUE' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthorRef { id: string; name: string }

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  author: AuthorRef;
}

export interface Task {
  id: string;
  title: string;
  note: string | null;
  status: TaskStatus;
  position: number;
  memberId: string;
  comments?: TaskComment[];
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  position: number;
  groupId: string;
  userId: string | null;
  tasks: Task[];
}

export interface Group {
  id: string;
  name: string;
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
  owner: AuthorRef;
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
