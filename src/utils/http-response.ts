import type { Response } from "express";

export function ok<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, 201);
}

