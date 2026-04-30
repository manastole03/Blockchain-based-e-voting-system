import type { Request, Response } from "express";
import type { ValidatorService } from "../services/validator.service";
import { created, ok } from "../utils/http-response";

export class ValidatorController {
  constructor(private readonly validatorService: ValidatorService) {}

  register = async (req: Request, res: Response): Promise<Response> => {
    const validator = await this.validatorService.register(req.body);
    return created(res, validator);
  };

  list = async (_req: Request, res: Response): Promise<Response> => {
    const validators = await this.validatorService.listActive();
    return ok(res, { validators });
  };
}

