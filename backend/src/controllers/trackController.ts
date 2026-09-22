import { Request, Response } from "express";
import { Track } from "../models";

function safeNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export async function listTracks(_req: Request, res: Response): Promise<void> {
  const tracks = await Track.find({ isActive: true }).sort({ name: 1 }).lean();

  const safeTracks = tracks.map((track) => {
    const capacity = safeNonNegative(track.capacity);
    const currentCount = safeNonNegative(track.currentCount);
    const remainingSlots = Math.max(0, capacity - currentCount);

    return {
      id: track._id.toString(),
      code: track.code,
      name: track.name,
      description: track.description,
      capacity,
      currentCount,
      remainingSlots,
    };
  });

  res.status(200).json({ success: true, data: { tracks: safeTracks } });
}
