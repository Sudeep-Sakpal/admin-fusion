import mongoose from "mongoose";
import { z } from "zod";

export const selectTrackSchema = z
  .object({
    trackId: z
      .string()
      .trim()
      .min(1, "trackId is required")
      .refine((value) => mongoose.isValidObjectId(value), {
        message: "trackId must be a valid id",
      }),
  })
  .strict();

export type SelectTrackInput = z.infer<typeof selectTrackSchema>;

export const selectProblemSchema = z
  .object({
    problemStatementId: z
      .string()
      .trim()
      .min(1, "problemStatementId is required")
      .refine((value) => mongoose.isValidObjectId(value), {
        message: "problemStatementId must be a valid id",
      }),
  })
  .strict();

export type SelectProblemInput = z.infer<typeof selectProblemSchema>;
