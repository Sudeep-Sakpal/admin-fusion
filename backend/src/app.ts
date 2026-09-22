import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { verifyOrigin } from "./middleware/verifyOrigin";
import authRouter from "./routes/auth";
import healthRouter from "./routes/health";
import teamRouter from "./routes/team";
import tracksRouter from "./routes/tracks";

const app = express();

app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(verifyOrigin);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/tracks", tracksRouter);
app.use("/api/team", teamRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
