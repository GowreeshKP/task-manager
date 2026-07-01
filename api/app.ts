import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createHash, randomBytes } from "crypto";
import mongoose from "mongoose";

// ─── DB Connection ────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}
if (!global._mongooseCache) global._mongooseCache = { conn: null, promise: null };

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (global._mongooseCache.conn) return global._mongooseCache.conn;
  if (!global._mongooseCache.promise) {
    global._mongooseCache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    });
  }
  global._mongooseCache.conn = await global._mongooseCache.promise;
  return global._mongooseCache.conn;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["pending", "in-progress", "done"], default: "pending" },
  color: { type: String, default: "#ffffff" },
  userId: { type: String },
  created_at: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
});

const TaskModel: mongoose.Model<any> =
  (mongoose.models["Task"] as mongoose.Model<any>) || mongoose.model("Task", taskSchema);
const UserModel: mongoose.Model<any> =
  (mongoose.models["User"] as mongoose.Model<any>) || mongoose.model("User", userSchema);
const SessionModel: mongoose.Model<any> =
  (mongoose.models["Session"] as mongoose.Model<any>) || mongoose.model("Session", sessionSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(p: string) {
  return createHash("sha256").update(p).digest("hex");
}
function generateToken() {
  return randomBytes(32).toString("hex");
}
function formatTask(t: any) {
  return {
    id: t._id.toString(),
    title: t.title,
    description: t.description,
    status: t.status,
    color: t.color,
    userId: t.userId,
    created_at: t.created_at instanceof Date ? t.created_at.toISOString() : t.created_at,
  };
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// DB middleware — connect before every request
app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    res.status(500).json({ error: `DB connection failed: ${err.message}` });
  }
});

// Auth middleware
async function authenticate(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const session = await SessionModel.findOne({ token });
      if (session) (req as any).user = { userId: session.userId, username: session.username };
    } catch {
      // ignore session errors
    }
  }
  next();
}

// ── Auth Routes ───────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });
  const cleanUsername = username.trim().toLowerCase();
  const passwordHash = hashPassword(password);
  try {
    if (await UserModel.findOne({ username: cleanUsername }))
      return res.status(400).json({ error: "Username is already taken" });
    const user = await new UserModel({ username: cleanUsername, passwordHash }).save();
    const token = generateToken();
    await SessionModel.create({ token, userId: user._id.toString(), username: user.username });
    return res.status(201).json({ user: { id: user._id.toString(), username: user.username, token } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });
  const cleanUsername = username.trim().toLowerCase();
  const passwordHash = hashPassword(password);
  try {
    const user = await UserModel.findOne({ username: cleanUsername, passwordHash });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });
    const token = generateToken();
    await SessionModel.create({ token, userId: user._id.toString(), username: user.username });
    return res.json({ user: { id: user._id.toString(), username: user.username, token } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try { await SessionModel.deleteOne({ token: authHeader.split(" ")[1] }); } catch {}
  }
  return res.json({ success: true });
});

// ── Task Routes ───────────────────────────────────────────────────────────────

app.get("/api/tasks", authenticate, async (req, res) => {
  const userId = (req as any).user?.userId || "anonymous";
  try {
    const tasks = await TaskModel.find({ userId }).sort({ created_at: -1 });
    return res.json(tasks.map(formatTask));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Could not fetch tasks" });
  }
});

app.post("/api/tasks", authenticate, async (req, res) => {
  const { title, description, status, color } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  const userId = (req as any).user?.userId || "anonymous";
  const validatedStatus = ["pending", "in-progress", "done"].includes(status) ? status : "pending";
  try {
    const task = await new TaskModel({
      title, description: description || "", status: validatedStatus,
      color: color || "#ffffff", userId,
    }).save();
    return res.status(201).json(formatTask(task));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Could not create task" });
  }
});

app.put("/api/tasks/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user?.userId || "anonymous";
  try {
    const task = await TaskModel.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.userId !== userId) return res.status(403).json({ error: "Access denied" });
    const { title, description, status, color } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined && ["pending", "in-progress", "done"].includes(status)) task.status = status;
    if (color !== undefined) task.color = color;
    await task.save();
    return res.json(formatTask(task));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Could not update task" });
  }
});

app.delete("/api/tasks/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user?.userId || "anonymous";
  try {
    const task = await TaskModel.findById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.userId !== userId) return res.status(403).json({ error: "Access denied" });
    await TaskModel.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Could not delete task" });
  }
});

// ── AI Route ──────────────────────────────────────────────────────────────────

app.post("/api/ai/generate", async (req, res) => {
  const { title } = req.body;
  if (!title?.trim())
    return res.status(400).json({ error: "A task title is required" });

  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const useGemini = geminiKey?.startsWith("AIza");
  const useOpenRouter = openRouterKey?.startsWith("sk-or-v1-");

  if (!useGemini && !useOpenRouter)
    return res.status(503).json({ error: "AI is not configured." });

  const prompt = `Write a professional, action-oriented, concise task description for: "${title}". Keep it to 3 sentences or fewer. Use basic HTML tags (<strong>, <p>, <ul>/<li>). Return only valid HTML, no markdown fences.`;

  try {
    let html = "";
    if (useGemini) {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        { method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": geminiKey! },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      );
      if (!r.ok) return res.status(502).json({ error: "Gemini API error" });
      html = (await r.json() as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (useOpenRouter) {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": process.env.APP_URL || "https://task-manager.vercel.app", "X-Title": "Task Manager AI" },
        body: JSON.stringify({ model: "openai/gpt-oss-20b:free", messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as any;
        if (r.status === 429) return res.status(429).json({ error: "AI rate-limited. Please wait and try again." });
        return res.status(502).json({ error: `OpenRouter error: ${err?.error?.message || r.status}` });
      }
      html = (await r.json() as any)?.choices?.[0]?.message?.content || "";
    }
    if (!html) return res.status(502).json({ error: "AI returned empty response." });
    html = html.replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    return res.json({ description: html.trim() });
  } catch (err: any) {
    return res.status(500).json({ error: "AI generation failed." });
  }
});

// ─── Export ───────────────────────────────────────────────────────────────────

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
