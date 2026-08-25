import { config } from "dotenv";

config();

export const env = {
  PORT: process.env.PORT || "5000",
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "change_this_long_random_secret",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV || "development",
};
