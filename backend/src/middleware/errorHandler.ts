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

export function errorHandler(
  err: Error | HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
}
