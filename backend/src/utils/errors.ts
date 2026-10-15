export class HttpError extends Error {
  /** Optional machine-readable list (e.g. conflicting slots, invalid import rows) returned as `errors`. */
  details?: unknown[];
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = "Authentication required") => new HttpError(401, message);
export const forbidden = (message = "Forbidden") => new HttpError(403, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
