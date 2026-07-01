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
  const { id } = req.query as { id: string };

  // ── PUT /api/tasks/:id ──────────────────────────────────────────────────────
  if (req.method === "PUT") {
    const { title, description, status, color } = req.body;
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
