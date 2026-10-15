import { Request, Response } from "express";
import { z } from "zod";
import * as orders from "../services/order.service";
import * as payments from "../services/payment.service";
import { success } from "../utils/apiResponse";
import { requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { badRequest } from "../utils/errors";

const createSchema = z.object({
  packageId: z.string().uuid(),
  couponCode: z.string().trim().toUpperCase().max(32).optional(),
});

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { packageId, couponCode } = createSchema.parse(req.body);
  success(res, await orders.createOrder(requireUserId(req), packageId, couponCode), 201);
};

export const listOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await orders.listOwnOrders(requireUserId(req)));
};

/** Polled by the checkout return page: it shows status, it never changes it. */
export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await orders.getOwnOrder(requireUserId(req), z.string().uuid().parse(req.params.id)));
};

export const webhook = async (req: Request, res: Response): Promise<void> => {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!raw) throw badRequest("Empty body");
  const result = await payments.handleWebhook(req.params.provider, raw, req.headers);
  // 200 even for duplicates/ignored events so the provider stops retrying.
  success(res, result);
};
