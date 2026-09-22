import { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// Malformed/oversized requests are rejected by body-parser before any
// handler runs. They are client errors, not server faults: they must not be
// reported as 500s, and must not be logged as unhandled errors with stack
// traces (that buries real bugs under scanner/abuse noise). Only the status
// is taken from the library error — the message is always our own, so no
// internal detail is ever echoed back.
const CLIENT_ERROR_MESSAGES: Record<number, string> = {
  400: "Malformed request",
  413: "Request payload too large",
  415: "Unsupported content type",
};

function clientErrorStatus(err: Error): number | null {
  const status = (err as { status?: unknown; statusCode?: unknown }).status
    ?? (err as { statusCode?: unknown }).statusCode;

  if (typeof status !== "number" || !Number.isInteger(status)) return null;
  if (status < 400 || status > 499) return null;

  return status;
}

export function errorHandler(
  err: Error | HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  const clientStatus = clientErrorStatus(err);
  if (clientStatus !== null) {
    console.warn(
      `Rejected malformed request ${req.method} ${req.originalUrl}: ` +
        `${err.name} (${clientStatus})`
    );
    res.status(clientStatus).json({
      success: false,
      message: CLIENT_ERROR_MESSAGES[clientStatus] ?? "Invalid request",
    });
    return;
  }

  // Unexpected error (Mongo/Mongoose internals, programming bugs, etc.).
  // Never forward its message/stack to the client — only curated HttpError
  // messages are safe to expose. Log server-side context for debugging.
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
}
