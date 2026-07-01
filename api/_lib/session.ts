import { createHash, randomBytes } from "crypto";
import { connectDB, SessionModel } from "./db";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Persist a new session to MongoDB and return the token. */
export async function createSession(
  userId: string,
  username: string
): Promise<string> {
  await connectDB();
  const token = generateToken();
  await SessionModel.create({ token, userId, username });
  return token;
}

/** Look up a session by token. Returns null if not found or expired. */
export async function getSession(
  token: string
): Promise<{ userId: string; username: string } | null> {
  await connectDB();
  const session = await SessionModel.findOne({ token });
  if (!session) return null;
  return { userId: session.userId, username: session.username };
}

/** Delete a session (logout). */
export async function deleteSession(token: string): Promise<void> {
  await connectDB();
  await SessionModel.deleteOne({ token });
}
