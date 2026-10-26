import { Request } from "express";
import type { ClientInfo } from "../services/session.service";

/** Browser string and client address of a request (req.ip honours TRUST_PROXY_HOPS behind the proxies). */
export const clientInfo = (req: Request): ClientInfo => ({ userAgent: req.get("user-agent") ?? undefined, ip: req.ip });
