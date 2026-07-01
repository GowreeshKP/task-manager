import type { VercelRequest, VercelResponse } from "@vercel/node";
import { connectDB, UserModel } from "../_lib/db";
import { hashPassword, createSession } from "../_lib/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const cleanUsername = (username as string).trim().toLowerCase();
  const passwordHash = hashPassword(password as string);

  try {
    await connectDB();

    if (await UserModel.findOne({ username: cleanUsername })) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const user = await new UserModel({ username: cleanUsername, passwordHash }).save();
    const token = await createSession(user._id.toString(), user.username);

    return res.status(201).json({
      user: { id: user._id.toString(), username: user.username, token },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Registration failed" });
  }
}
