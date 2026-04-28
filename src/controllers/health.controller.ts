import type { Request, Response } from "express";
import { ok } from "../utils/http-response";

export class HealthController {
  check(_req: Request, res: Response): Response {
    return ok(res, {
      status: "ok",
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }
}

