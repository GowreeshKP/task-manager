import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteSession } from "../_lib/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      await deleteSession(token);
    } catch {
      // Best-effort — don't block logout on DB errors
    }
  }

  return res.json({ success: true });
}
