export type UserRole = "TEAM_LEADER" | "ADMIN";

export type SelectionStatus = "PENDING" | "TRACK_SELECTED" | "COMPLETED";

export interface AuthUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  team: {
    id: string;
    name: string;
    track: string | null;
    problemStatement: string | null;
    selectionStatus: SelectionStatus;
  } | null;
}

export interface AdminDashboard {
  teams: {
    total: number;
    pending: number;
    trackSelected: number;
    completed: number;
  };
  tracks: { totalActive: number };
  problemStatements: { totalActive: number };
  perTrack: Array<{
    id: string;
    code: string;
    name: string;
    capacity: number;
    currentCount: number;
    remainingSlots: number;
  }>;
}

export interface AdminTeamRef {
  id: string;
  code: string;
  name: string;
}

export interface AdminTeamPSRef {
  id: string;
  code: string;
  title: string;
}

export interface AdminTeam {
  id: string;
  name: string;
  leader: { name: string; email: string } | null;
  selectionStatus: SelectionStatus;
  track: AdminTeamRef | null;
  problemStatement: AdminTeamPSRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTrack {
  id: string;
  code: string;
  name: string;
  description: string;
  capacity: number;
  currentCount: number;
  remainingSlots: number;
  isActive: boolean;
}

export interface AdminProblemStatement {
  id: string;
  code: string;
  title: string;
  description: string;
  track: AdminTeamRef | null;
  isActive: boolean;
}
