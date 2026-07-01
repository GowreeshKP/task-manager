import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, ".env.local") });

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";

const app = express();
const PORT = 3000;

app.use(express.json());

// --- Database ---
let isMongoDB = false;
const MONGODB_URI = process.env.MONGODB_URI;
const TASKS_FILE = path.join(process.cwd(), "db_tasks.json");
const USERS_FILE = path.join(process.cwd(), "db_users.json");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["pending", "in-progress", "done"], default: "pending" },
  color: { type: String, default: "#ffffff" },
  userId: { type: String, required: false },
  created_at: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

let TaskModel: mongoose.Model<any>;
let UserModel: mongoose.Model<any>;

async function connectDatabase() {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log("✅ Connected to MongoDB");
      TaskModel = mongoose.model("Task", taskSchema);
      UserModel = mongoose.model("User", userSchema);
      isMongoDB = true;
    } catch (err: any) {
      console.warn(`⚠️  MongoDB failed (${err?.message}). Using local JSON fallback.`);
      setupLocalDB();
    }
  } else {
    setupLocalDB();
  }
}

function setupLocalDB() {
  isMongoDB = false;
  if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

function readLocalFile(filePath: string): any[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeLocalFile(filePath: string, data: any[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const activeSessions = new Map<string, { userId: string; username: string }>();

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  const token = authHeader.split(" ")[1];
  const session = activeSessions.get(token);
  if (!session) return res.status(401).json({ error: "Invalid or expired session token" });
  (req as any).user = session;
  next();
}

function formatTask(task: any) {
  return {
    id: isMongoDB ? task._id.toString() : task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    color: task.color,
    userId: task.userId,
    created_at: isMongoDB ? task.created_at.toISOString() : task.created_at,
  };
}

connectDatabase();

// --- Auth Routes ---
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });

  const cleanUsername = username.trim().toLowerCase();
  const passwordHash = hashPassword(password);

  try {
    if (isMongoDB) {
      if (await UserModel.findOne({ username: cleanUsername }))
        return res.status(400).json({ error: "Username is already taken" });
      const user = await new UserModel({ username: cleanUsername, passwordHash }).save();
      const token = generateToken();
      activeSessions.set(token, { userId: user._id.toString(), username: user.username });
      return res.status(201).json({ user: { id: user._id.toString(), username: user.username, token } });
    } else {
      const users = readLocalFile(USERS_FILE);
      if (users.find((u) => u.username === cleanUsername))
        return res.status(400).json({ error: "Username is already taken" });
      const newUser = { id: crypto.randomUUID(), username: cleanUsername, passwordHash, created_at: new Date().toISOString() };
      users.push(newUser);
      writeLocalFile(USERS_FILE, users);
      const token = generateToken();
      activeSessions.set(token, { userId: newUser.id, username: newUser.username });
      return res.status(201).json({ user: { id: newUser.id, username: newUser.username, token } });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });

  const cleanUsername = username.trim().toLowerCase();
  const passwordHash = hashPassword(password);

  try {
    if (isMongoDB) {
      const user = await UserModel.findOne({ username: cleanUsername, passwordHash });
      if (!user) return res.status(401).json({ error: "Invalid username or password" });
      const token = generateToken();
      activeSessions.set(token, { userId: user._id.toString(), username: user.username });
      return res.json({ user: { id: user._id.toString(), username: user.username, token } });
    } else {
      const users = readLocalFile(USERS_FILE);
      const user = users.find((u) => u.username === cleanUsername && u.passwordHash === passwordHash);
      if (!user) return res.status(401).json({ error: "Invalid username or password" });
      const token = generateToken();
      activeSessions.set(token, { userId: user.id, username: user.username });
      return res.json({ user: { id: user.id, username: user.username, token } });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    activeSessions.delete(authHeader.split(" ")[1]);
  }
  res.json({ success: true });
});

// --- Task Routes ---
const getTasksHandler = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.userId || "anonymous";
  try {
    if (isMongoDB) {
      return res.json((await TaskModel.find({ userId }).sort({ created_at: -1 })).map(formatTask));
    } else {
      const tasks = readLocalFile(TASKS_FILE)
        .filter((t) => t.userId === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res.json(tasks.map(formatTask));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Could not fetch tasks" });
  }
};

const postTaskHandler = async (req: express.Request, res: express.Response) => {
  const { title, description, status, color } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const userId = (req as any).user?.userId || "anonymous";
  const validatedStatus = ["pending", "in-progress", "done"].includes(status) ? status : "pending";
  const taskColor = color || "#ffffff";

  try {
    if (isMongoDB) {
      const newTask = await new TaskModel({ title, description: description || "", status: validatedStatus, color: taskColor, userId }).save();
      return res.status(201).json(formatTask(newTask));
    } else {
      const tasks = readLocalFile(TASKS_FILE);
      const newTask = { id: crypto.randomUUID(), title, description: description || "", status: validatedStatus, color: taskColor, userId, created_at: new Date().toISOString() };
      tasks.push(newTask);
      writeLocalFile(TASKS_FILE, tasks);
      return res.status(201).json(formatTask(newTask));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Could not create task" });
  }
};

const putTaskHandler = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { title, description, status, color } = req.body;
  const userId = (req as any).user?.userId || "anonymous";

  try {
    if (isMongoDB) {
      const task = await TaskModel.findById(id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      if (task.userId !== userId) return res.status(403).json({ error: "Access denied" });
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (status !== undefined && ["pending", "in-progress", "done"].includes(status)) task.status = status;
      if (color !== undefined) task.color = color;
      await task.save();
      return res.json(formatTask(task));
    } else {
      const tasks = readLocalFile(TASKS_FILE);
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) return res.status(404).json({ error: "Task not found" });
      if (tasks[idx].userId !== userId) return res.status(403).json({ error: "Access denied" });
      const updated = { ...tasks[idx] };
      if (title !== undefined) updated.title = title;
      if (description !== undefined) updated.description = description;
      if (status !== undefined && ["pending", "in-progress", "done"].includes(status)) updated.status = status;
      if (color !== undefined) updated.color = color;
      tasks[idx] = updated;
      writeLocalFile(TASKS_FILE, tasks);
      return res.json(formatTask(updated));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Could not update task" });
  }
};

const deleteTaskHandler = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.userId || "anonymous";

  try {
    if (isMongoDB) {
      const task = await TaskModel.findById(id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      if (task.userId !== userId) return res.status(403).json({ error: "Access denied" });
      await TaskModel.findByIdAndDelete(id);
      return res.json({ success: true });
    } else {
      const tasks = readLocalFile(TASKS_FILE);
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) return res.status(404).json({ error: "Task not found" });
      if (tasks[idx].userId !== userId) return res.status(403).json({ error: "Access denied" });
      tasks.splice(idx, 1);
      writeLocalFile(TASKS_FILE, tasks);
      return res.json({ success: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Could not delete task" });
  }
};

app.get("/api/tasks", authenticate, getTasksHandler);
app.post("/api/tasks", authenticate, postTaskHandler);
app.put("/api/tasks/:id", authenticate, putTaskHandler);
app.delete("/api/tasks/:id", authenticate, deleteTaskHandler);

// --- AI Description Generator ---
app.post("/api/ai/generate", async (req, res) => {
  const { title } = req.body;
  if (!title?.trim())
    return res.status(400).json({ error: "A task title is required to generate a description" });

  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const useGemini = geminiKey?.startsWith("AIza");
  const useOpenRouter = openRouterKey?.startsWith("sk-or-v1-");

  if (!useGemini && !useOpenRouter)
    return res.status(503).json({ error: "AI is not configured. Add a GEMINI_API_KEY or OPENROUTER_API_KEY to .env.local." });

  const prompt = `Write a professional, action-oriented, concise task description for: "${title}".
Keep it to 3 sentences or fewer. Use basic HTML tags (<strong>, <p>, <ul>/<li>). Return only valid HTML, no markdown fences.`;

  try {
    let htmlContent = "";

    if (useGemini) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": geminiKey! },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as any;
        return res.status(502).json({ error: `Gemini API error: ${err?.error?.message || response.status}` });
      }
      htmlContent = (await response.json() as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (useOpenRouter) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Task Manager AI",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b:free",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as any;
        const code = err?.error?.code;
        if (code === 429 || response.status === 429) {
          const wait = Math.ceil(err?.error?.metadata?.retry_after_seconds ?? 30);
          return res.status(429).json({ error: `AI rate-limited. Please wait ${wait}s and try again.` });
        }
        return res.status(502).json({ error: `OpenRouter error: ${err?.error?.message || response.status}` });
      }
      htmlContent = (await response.json() as any)?.choices?.[0]?.message?.content || "";
    }

    if (!htmlContent)
      return res.status(502).json({ error: "AI returned an empty response. Please try again." });

    // Strip markdown fences if model wrapped the output
    htmlContent = htmlContent.replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

    return res.json({ description: htmlContent.trim() });
  } catch (err: any) {
    return res.status(500).json({ error: "AI generation failed. Please try again." });
  }
});

// --- Server Start ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running → http://localhost:${PORT}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Kill the existing process first.`);
    } else {
      console.error("❌ Server error:", err);
    }
    process.exit(1);
  });
}

startServer();
