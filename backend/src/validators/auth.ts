import { z } from "zod";
import { httpUrl } from "./common";
import { normalizeUzPhone } from "../lib/phone";

/** Uzbek mobile number in any common spelling, stored as "+998XXXXXXXXX". */
export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .transform((v, ctx) => {
    const phone = normalizeUzPhone(v);
    if (!phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid phone number" });
      return z.NEVER;
    }
    return phone;
  });

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100)
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a digit");

// The site signs people up with a phone number; e-mail is optional (older clients still send only e-mail).
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().toLowerCase().email("Invalid email").optional(),
    password,
    phone: phoneSchema.optional(),
  })
  .refine((v) => v.phone || v.email, { message: "Phone number is required", path: ["phone"] });

// Log in with the phone number (or e-mail, for staff and older accounts).
export const loginSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: z.string().trim().toLowerCase().email("Invalid email").optional(),
    password: z.string().min(1, "Password is required").max(100),
  })
  .refine((v) => v.phone || v.email, { message: "Phone number is required", path: ["phone"] });

// First and last name, each at least 2 letters ("Ali Valiyev"); extra spaces are collapsed.
const fullNameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .max(100)
      .refine((v) => v.split(" ").filter((p) => p.length >= 2).length >= 2, "Enter your first and last name")
  );

export const completeRegistrationSchema = z.object({
  name: fullNameSchema,
  phone: phoneSchema,
  password,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  // "" clears the number.
  phone: z.union([z.literal("").transform(() => null), phoneSchema]).optional().nullable(),
  avatarUrl: httpUrl.optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: password,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20).max(200),
});

// A 6-digit TOTP code or a recovery code (xxxxx-xxxxx).
const secondFactorCode = z.string().trim().min(6).max(20);

export const twoFactorLoginSchema = z.object({
  challengeToken: z.string().min(20).max(2000),
  code: secondFactorCode,
});

export const twoFactorCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().max(100).optional(),
  code: secondFactorCode,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompleteRegistrationInput = z.infer<typeof completeRegistrationSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
