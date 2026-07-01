import type { VercelRequest, VercelResponse } from "@vercel/node";
import { connectDB, TaskModel, formatTask } from "../_lib/db";
import { getSession } from "../_lib/session";

async function resolveUser(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const session = await getSession(authHeader.split(" ")[1]);
      if (session) return session;
    } catch {
      // session lookup failed — fall through to anonymous
    }
  }
  return { userId: "anonymous", username: "anonymous" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Top-level try-catch so any crash returns JSON, not an empty 500
  try {
    await connectDB();
  } catch (err: any) {
    return res.status(500).json({ error: `DB connection failed: ${err.message}` });
  }

  let userId = "anonymous";
  try {
    const u = await resolveUser(req);
    userId = u.userId;
  } catch {
    // session resolution failed — continue as anonymous
  }

  const { id } = req.query as { id: string };

  if (!id) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  // ── PUT /api/tasks/:id ──────────────────────────────────────────────────────
  if (req.method === "PUT") {
    const { title, description, status, color } = req.body || {};
    try {
      const task = await TaskModel.findById(id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      if (task.userId !== userId) return res.status(403).json({ error: "Access denied" });

      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (status !== undefined && ["pending", "in-progress", "done"].includes(status))
        task.status = status;
      if (color !== undefined) task.color = color;

      await task.save();
      return res.json(formatTask(task));
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Could not update task" });
    }
  }

  // ── DELETE /api/tasks/:id ───────────────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      const task = await TaskModel.findById(id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      if (task.userId !== userId) return res.status(403).json({ error: "Access denied" });

      await TaskModel.findByIdAndDelete(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Could not delete task" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
