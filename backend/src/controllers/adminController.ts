import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { HttpError } from "../middleware/errorHandler";
import {
  ITrack,
  ProblemStatement,
  Team,
  TeamSelectionStatus,
  Track,
  User,
  UserRole,
} from "../models";

/**
 * Re-verifies the caller against the database on every admin request,
 * beyond the JWT-role check already done by requireRole. This catches an
 * admin account being deactivated (or demoted) after their token was
 * issued, and matches the same "never trust the token alone, confirm
 * against the User record" pattern used for isActive checks in M3/M4.
 */
async function resolveActiveAdmin(authUserId: string) {
  const admin = await User.findById(authUserId);
  if (!admin || !admin.isActive || admin.role !== UserRole.ADMIN) {
    throw new HttpError(403, "You do not have permission to perform this action");
  }
  return admin;
}

function safeNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function serializeTrackUsage(track: Pick<ITrack, "_id" | "code" | "name" | "capacity" | "currentCount">) {
  const capacity = safeNonNegative(track.capacity);
  const currentCount = safeNonNegative(track.currentCount);
  return {
    id: track._id.toString(),
    code: track.code,
    name: track.name,
    capacity,
    currentCount,
    remainingSlots: Math.max(0, capacity - currentCount),
  };
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  await resolveActiveAdmin(req.user!.id);

  const [statusCounts, teamsPerTrack, totalActiveTracks, totalActivePS, activeTracks] =
    await Promise.all([
      Team.aggregate<{ _id: TeamSelectionStatus; count: number }>([
        { $group: { _id: "$selectionStatus", count: { $sum: 1 } } },
      ]),
      Team.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { track: { $ne: null } } },
        { $group: { _id: "$track", count: { $sum: 1 } } },
      ]),
      Track.countDocuments({ isActive: true }),
      ProblemStatement.countDocuments({ isActive: true }),
      Track.find({ isActive: true }).sort({ name: 1 }).lean(),
    ]);

  const statusCountMap = new Map(statusCounts.map((s) => [s._id, s.count]));
  const pending = statusCountMap.get(TeamSelectionStatus.PENDING) ?? 0;
  const trackSelected = statusCountMap.get(TeamSelectionStatus.TRACK_SELECTED) ?? 0;
  const completed = statusCountMap.get(TeamSelectionStatus.COMPLETED) ?? 0;

  const actualTeamCountByTrack = new Map(
    teamsPerTrack.map((t) => [t._id.toString(), t.count])
  );

  const perTrack = activeTracks.map((track) => {
    const usage = serializeTrackUsage(track);

    // Track.currentCount is the authoritative counter (per M3's atomic
    // reservation design) — never recomputed/overwritten here. This is
    // purely a read-only integrity check: if it ever drifts from the
    // actual number of teams referencing this track, that's a data bug
    // worth investigating, not something a GET endpoint should silently
    // "fix".
    const actualCount = actualTeamCountByTrack.get(track._id.toString()) ?? 0;
    if (actualCount !== usage.currentCount) {
      console.error(
        `Data integrity check: track ${track._id.toString()} (${track.code}) has ` +
          `currentCount=${usage.currentCount} but ${actualCount} teams actually ` +
          `reference it. Flagging for integrity audit; not auto-correcting.`
      );
    }

    return usage;
  });

  res.status(200).json({
    success: true,
    data: {
      teams: {
        total: pending + trackSelected + completed,
        pending,
        trackSelected,
        completed,
      },
      tracks: { totalActive: totalActiveTracks },
      problemStatements: { totalActive: totalActivePS },
      perTrack,
    },
  });
}

interface PopulatedTeamLean {
  _id: Types.ObjectId;
  name: string;
  selectionStatus: TeamSelectionStatus;
  track: { _id: Types.ObjectId; code: string; name: string } | null;
  problemStatement: { _id: Types.ObjectId; code: string; title: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

function serializeAdminTeam(
  team: PopulatedTeamLean,
  leader: { name: string; email: string } | null
) {
  return {
    id: team._id.toString(),
    name: team.name,
    leader,
    selectionStatus: team.selectionStatus,
    track: team.track
      ? { id: team.track._id.toString(), code: team.track.code, name: team.track.name }
      : null,
    problemStatement: team.problemStatement
      ? {
          id: team.problemStatement._id.toString(),
          code: team.problemStatement.code,
          title: team.problemStatement.title,
        }
      : null,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

export async function listTeams(req: Request, res: Response): Promise<void> {
  await resolveActiveAdmin(req.user!.id);

  // Two queries total (not one per team): all teams with their track/PS
  // populated in a single additional lookup each, plus one query for every
  // team-leader's name/email, joined in memory by team id. Avoids N+1.
  const [teams, leaders] = await Promise.all([
    Team.find({})
      .populate("track", "code name")
      .populate("problemStatement", "code title")
      .sort({ name: 1 })
      .lean() as unknown as Promise<PopulatedTeamLean[]>,
    User.find({ role: UserRole.TEAM_LEADER, team: { $ne: null } })
      .select("name email team")
      .lean(),
  ]);

  const leaderByTeamId = new Map(
    leaders.map((u) => [u.team!.toString(), { name: u.name, email: u.email }])
  );

  const safeTeams = teams.map((team) =>
    serializeAdminTeam(team, leaderByTeamId.get(team._id.toString()) ?? null)
  );

  res.status(200).json({ success: true, data: { teams: safeTeams } });
}

export async function getTeamDetail(req: Request, res: Response): Promise<void> {
  await resolveActiveAdmin(req.user!.id);

  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, "Invalid team id");
  }

  const team = (await Team.findById(id)
    .populate("track", "code name")
    .populate("problemStatement", "code title")
    .lean()) as unknown as PopulatedTeamLean | null;

  if (!team) {
    throw new HttpError(404, "Team not found");
  }

  const leaderDoc = await User.findOne({ team: team._id, role: UserRole.TEAM_LEADER })
    .select("name email")
    .lean();
  const leader = leaderDoc ? { name: leaderDoc.name, email: leaderDoc.email } : null;

  res.status(200).json({ success: true, data: { team: serializeAdminTeam(team, leader) } });
}

export async function listAdminTracks(req: Request, res: Response): Promise<void> {
  await resolveActiveAdmin(req.user!.id);

  const tracks = await Track.find({}).sort({ name: 1 }).lean();

  const safeTracks = tracks.map((track) => ({
    ...serializeTrackUsage(track),
    description: track.description,
    isActive: track.isActive,
  }));

  res.status(200).json({ success: true, data: { tracks: safeTracks } });
}

interface PopulatedProblemStatementLean {
  _id: Types.ObjectId;
  code: string;
  title: string;
  description: string;
  track: { _id: Types.ObjectId; code: string; name: string } | null;
  isActive: boolean;
}

export async function listAdminProblemStatements(
  req: Request,
  res: Response
): Promise<void> {
  await resolveActiveAdmin(req.user!.id);

  const problemStatements = (await ProblemStatement.find({})
    .populate("track", "code name")
    .sort({ code: 1 })
    .lean()) as unknown as PopulatedProblemStatementLean[];

  const safe = problemStatements.map((ps) => ({
    id: ps._id.toString(),
    code: ps.code,
    title: ps.title,
    description: ps.description,
    track: ps.track
      ? { id: ps.track._id.toString(), code: ps.track.code, name: ps.track.name }
      : null,
    isActive: ps.isActive,
  }));

  res.status(200).json({ success: true, data: { problemStatements: safe } });
}
