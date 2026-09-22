import { Types } from "mongoose";
import { IUser } from "../models/User";
import { ITeam } from "../models/Team";

export interface SafeTeam {
  id: string;
  name: string;
  track: Types.ObjectId | null;
  problemStatement: Types.ObjectId | null;
  selectionStatus: string;
}

export interface SafeUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  team: SafeTeam | null;
}

function isPopulatedTeam(
  team: IUser["team"] | ITeam
): team is ITeam {
  return !!team && typeof team === "object" && "name" in team;
}

export function serializeUser(user: IUser): SafeUser {
  const team = isPopulatedTeam(user.team as unknown as ITeam)
    ? (user.team as unknown as ITeam)
    : null;

  return {
    id: user._id.toString(),
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    team: team
      ? {
          id: team._id.toString(),
          name: team.name,
          track: team.track,
          problemStatement: team.problemStatement,
          selectionStatus: team.selectionStatus,
        }
      : null,
  };
}
