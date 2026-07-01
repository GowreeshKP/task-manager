import type { VercelRequest, VercelResponse } from "@vercel/node";
import { connectDB, TaskModel, formatTask } from "../_lib/db";
import { getSession } from "../_lib/session";

async function resolveUser(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const session = await getSession(authHeader.split(" ")[1]);
    if (session) return session;
  }
  return { userId: "anonymous", username: "anonymous" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();
  const { userId } = await resolveUser(req);

  // ── GET /api/tasks ──────────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const tasks = await TaskModel.find({ userId }).sort({ created_at: -1 });
      return res.json(tasks.map(formatTask));
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Could not fetch tasks" });
    }
  }

  // ── POST /api/tasks ─────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const { title, description, status, color } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const validatedStatus = ["pending", "in-progress", "done"].includes(status)
      ? status
      : "pending";
    const taskColor = color || "#ffffff";

    try {
      const newTask = await new TaskModel({
        title,
        description: description || "",
        status: validatedStatus,
        color: taskColor,
        userId,
      }).save();
      return res.status(201).json(formatTask(newTask));
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Could not create task" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
