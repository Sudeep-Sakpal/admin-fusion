import { Request, Response } from "express";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errorHandler";
import { ITeam, ITrack, Team, TeamSelectionStatus, Track, User } from "../models";
import { selectTrackSchema } from "../validators/teamValidators";

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
