import { z } from "zod";

export const loginSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  password: z.string().min(1, "password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
