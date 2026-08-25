import { prisma } from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { RegisterInput, LoginInput, UpdateProfileInput } from "../validators/auth";

export const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    const err: any = new Error("Email already registered");
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "USER",
    },
  });

  const token = generateToken({ userId: user.id, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase(),
    },
    token,
  };
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    const err: any = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    const err: any = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const token = generateToken({ userId: user.id, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase(),
    },
    token,
  };
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const err: any = new Error("User not found");
    err.status = 404;
    throw err;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const updateProfile = async (
  userId: string,
  input: UpdateProfileInput
) => {
  if (input.email) {
    const existing = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: userId } },
    });
    if (existing) {
      const err: any = new Error("Email already in use");
      err.status = 409;
      throw err;
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export default { register, login, getMe, updateProfile };
