import { Request, Response } from "express";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errorHandler";
import {
  IProblemStatement,
  ITeam,
  ITrack,
  ProblemStatement,
  Team,
  TeamSelectionStatus,
  Track,
  User,
} from "../models";
import { selectProblemSchema, selectTrackSchema } from "../validators/teamValidators";

interface SelectionOutcome {
  team: ITeam;
  track: ITrack;
  alreadySelected: boolean;
}

/**
 * Atomically reserves one capacity slot on a track and assigns it to the
 * caller's team, or safely returns the caller's existing identical
 * selection if this is a retry/duplicate request.
 *
 * Consistency strategy: the whole operation runs inside a MongoDB
 * transaction (session.withTransaction). This is safe for this app's
 * target deployment (MongoDB Atlas, which always runs as a replica set,
 * so multi-document transactions are supported) and gives an all-or-nothing
 * guarantee across the Track and Team documents: if the Team update fails
 * for any reason after the Track slot was reserved, the whole transaction
 * (including the Track's $inc) is rolled back automatically — there is no
 * window where a slot is reserved but not assigned, even across a crash
 * before commit (nothing becomes visible to other readers until commit).
 *
 * On top of the transaction, the actual capacity check-and-reserve is done
 * as a single atomic conditional update
 * (`findOneAndUpdate` with `$expr: { $lt: ["$currentCount", "$capacity"] }`).
 * This is what actually prevents overselling: MongoDB serializes writes to
 * a single document, so even many concurrent transactions racing for the
 * last slot can only have one of them match-and-increment; every other
 * concurrent attempt re-reads the now-updated count (after a write-conflict
 * retry) and correctly finds the condition false. The transaction's job is
 * only to keep the Team update consistent with that reservation, not to
 * enforce capacity by itself.
 */
export async function selectTrack(req: Request, res: Response): Promise<void> {
  const parsed = selectTrackSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid input");
  }
  const { trackId } = parsed.data;

  // The team is derived ONLY from the authenticated user's identity
  // (req.user is set by requireAuth from the verified JWT). The client
  // cannot influence which team this affects.
  const authUserId = req.user!.id;

  const session = await mongoose.startSession();
  let outcome: SelectionOutcome;

  try {
    outcome = await session.withTransaction<SelectionOutcome>(async () => {
      const user = await User.findById(authUserId).session(session);
      if (!user || !user.isActive) {
        throw new HttpError(403, "Account is not authorized to perform this action");
      }

      if (!user.team) {
        throw new HttpError(403, "No team is associated with this account");
      }

      const team = await Team.findById(user.team).session(session);
      if (!team) {
        // The user's team reference points at a team that no longer
        // exists (deleted/corrupt data) — fail safely rather than guessing.
        throw new HttpError(409, "Associated team could not be found");
      }

      if (team.track) {
        if (team.track.toString() === trackId) {
          // Idempotent: same team, same track, repeated/duplicate request.
          const existingTrack = await Track.findById(team.track).session(session);
          if (!existingTrack) {
            throw new HttpError(409, "Associated track could not be found");
          }
          return { team, track: existingTrack, alreadySelected: true };
        }
        throw new HttpError(409, "Team has already selected a different track");
      }

      // Atomic, conditional capacity reservation — the database itself
      // enforces the capacity rule in this single operation. The explicit
      // currentCount >= 0 and capacity > 0 guards make sure a corrupt
      // negative currentCount can never slip past the $lt comparison and
      // get "blindly allocated" (a negative number is always < a positive
      // capacity, so without this guard corrupt data would look like free
      // capacity).
      const reservedTrack = await Track.findOneAndUpdate(
        {
          _id: trackId,
          isActive: true,
          capacity: { $gt: 0 },
          currentCount: { $gte: 0 },
          $expr: { $lt: ["$currentCount", "$capacity"] },
        },
        { $inc: { currentCount: 1 } },
        { new: true, session }
      );

      if (!reservedTrack) {
        const existingTrack = await Track.findById(trackId).session(session);

        if (!existingTrack || !existingTrack.isActive) {
          throw new HttpError(404, "Track not found");
        }

        if (
          existingTrack.currentCount < 0 ||
          existingTrack.capacity <= 0 ||
          existingTrack.currentCount > existingTrack.capacity
        ) {
          console.error(
            `Data integrity issue: track ${existingTrack._id.toString()} has an ` +
              `invalid capacity state (currentCount=${existingTrack.currentCount}, ` +
              `capacity=${existingTrack.capacity})`
          );
        }

        throw new HttpError(409, "This track is not available for selection");
      }

      // Compare-and-swap: only assign if the team still has no track. This
      // guards against a concurrent duplicate request from the same team
      // slipping past the earlier check within the same transaction
      // window; if it happens, we abort and the reservation above is
      // rolled back automatically with the rest of the transaction.
      const updatedTeam = await Team.findOneAndUpdate(
        { _id: team._id, track: null },
        {
          $set: {
            track: reservedTrack._id,
            selectionStatus: TeamSelectionStatus.TRACK_SELECTED,
          },
        },
        { new: true, session }
      );

      if (!updatedTeam) {
        throw new HttpError(409, "Team has already selected a track");
      }

      return { team: updatedTeam, track: reservedTrack, alreadySelected: false };
    });
  } finally {
    await session.endSession();
  }

  const { team, track, alreadySelected } = outcome;

  res.status(200).json({
    success: true,
    data: {
      alreadySelected,
      team: {
        id: team._id.toString(),
        name: team.name,
        selectionStatus: team.selectionStatus,
        track: {
          id: track._id.toString(),
          code: track.code,
          name: track.name,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------
// M4: Problem statement listing and selection
// ---------------------------------------------------------------------

/**
 * Resolves the authenticated caller's own team, performing the same
 * identity/authorization checks used by track selection: the team is
 * derived solely from the verified JWT (req.user.id) -> User.team -> Team,
 * never from any client-supplied id. Used by both M4 endpoints below.
 */
async function resolveAuthorizedTeam(authUserId: string): Promise<ITeam> {
  const user = await User.findById(authUserId);
  if (!user || !user.isActive) {
    throw new HttpError(403, "Account is not authorized to perform this action");
  }

  if (!user.team) {
    throw new HttpError(403, "No team is associated with this account");
  }

  const team = await Team.findById(user.team);
  if (!team) {
    // Dangling/deleted team reference — fail safely rather than guessing.
    throw new HttpError(409, "Associated team could not be found");
  }

  return team;
}

export async function listProblemStatements(req: Request, res: Response): Promise<void> {
  const team = await resolveAuthorizedTeam(req.user!.id);

  if (!team.track) {
    throw new HttpError(
      409,
      "Team must select a track before viewing problem statements"
    );
  }

  // The team's track (from the database, never from a client-supplied
  // trackId/query param) is the only source of truth for which problem
  // statements are visible.
  const problemStatements = await ProblemStatement.find({
    track: team.track,
    isActive: true,
  })
    .sort({ code: 1 })
    .lean();

  const safeProblemStatements = problemStatements.map((ps) => ({
    id: ps._id.toString(),
    code: ps.code,
    title: ps.title,
    description: ps.description,
    trackId: ps.track.toString(),
  }));

  res.status(200).json({
    success: true,
    data: { problemStatements: safeProblemStatements },
  });
}

interface ProblemSelectionOutcome {
  team: ITeam;
  problemStatement: IProblemStatement;
  alreadySelected: boolean;
}

/**
 * Consistency strategy: unlike track selection, this mutation only ever
 * touches a single document (Team) — there is no second document (like
 * Track.currentCount in M3) that must change in lockstep, so a
 * multi-document transaction would be unnecessary infrastructure here. A
 * single atomic conditional update — findOneAndUpdate filtered on the
 * exact state just verified (selectionStatus: TRACK_SELECTED, track: this
 * team's track) — gives the same all-or-nothing guarantee for this one
 * document. MongoDB serializes writes to a single document, so concurrent
 * requests from the same team can only have one of them match; every
 * other one fails to match and is reconciled below instead of blindly
 * retried, which is what keeps duplicate/racing requests idempotent.
 */
async function resolveProblemSelection(
  team: ITeam,
  trackId: string,
  problemStatementId: string
): Promise<ProblemSelectionOutcome> {
  if (team.selectionStatus === TeamSelectionStatus.COMPLETED) {
    if (team.problemStatement && team.problemStatement.toString() === problemStatementId) {
      // Idempotent: same team, same problem statement, repeated request.
      const existing = await ProblemStatement.findById(team.problemStatement);
      if (!existing) {
        throw new HttpError(409, "Associated problem statement could not be found");
      }
      return { team, problemStatement: existing, alreadySelected: true };
    }
    throw new HttpError(409, "Team has already selected a different problem statement");
  }

  if (team.selectionStatus !== TeamSelectionStatus.TRACK_SELECTED) {
    // Anything other than TRACK_SELECTED or COMPLETED here (e.g. PENDING,
    // or a corrupted/unexpected value) is an invalid state to transition
    // from — never blindly update, log for investigation and reject.
    console.error(
      `Unexpected selectionStatus "${team.selectionStatus}" for team ` +
        `${team._id.toString()} during problem-statement selection`
    );
    throw new HttpError(409, "Team is not in a valid state to select a problem statement");
  }

  const problemStatement = await ProblemStatement.findOne({
    _id: problemStatementId,
    isActive: true,
  });

  if (!problemStatement) {
    throw new HttpError(404, "Problem statement not found");
  }

  // Server-side relationship check using trusted database state only —
  // never the client's claimed track. This is what makes cross-track
  // selection impossible regardless of frontend filtering.
  if (problemStatement.track.toString() !== trackId) {
    throw new HttpError(409, "Problem statement does not belong to the selected track");
  }

  const updatedTeam = await Team.findOneAndUpdate(
    {
      _id: team._id,
      selectionStatus: TeamSelectionStatus.TRACK_SELECTED,
      track: team.track,
    },
    {
      $set: {
        problemStatement: problemStatement._id,
        selectionStatus: TeamSelectionStatus.COMPLETED,
      },
    },
    { returnDocument: "after" }
  );

  if (updatedTeam) {
    return { team: updatedTeam, problemStatement, alreadySelected: false };
  }

  // Lost a race to a concurrent request from the same team. Re-read the
  // current state and classify it rather than assuming success or failure.
  const currentTeam = await Team.findById(team._id);
  if (
    currentTeam?.selectionStatus === TeamSelectionStatus.COMPLETED &&
    currentTeam.problemStatement?.toString() === problemStatementId
  ) {
    return { team: currentTeam, problemStatement, alreadySelected: true };
  }

  throw new HttpError(409, "Team has already selected a problem statement");
}

export async function selectProblemStatement(req: Request, res: Response): Promise<void> {
  const parsed = selectProblemSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid input");
  }
  const { problemStatementId } = parsed.data;

  const team = await resolveAuthorizedTeam(req.user!.id);

  if (!team.track) {
    throw new HttpError(
      409,
      "Team must select a track before selecting a problem statement"
    );
  }

  const { team: finalTeam, problemStatement, alreadySelected } =
    await resolveProblemSelection(team, team.track.toString(), problemStatementId);

  res.status(200).json({
    success: true,
    data: {
      alreadySelected,
      team: {
        id: finalTeam._id.toString(),
        name: finalTeam.name,
        selectionStatus: finalTeam.selectionStatus,
        problemStatement: {
          id: problemStatement._id.toString(),
          code: problemStatement.code,
          title: problemStatement.title,
        },
      },
    },
  });
}
