import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable.");
}

// Extend global to cache the connection across serverless hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  if (global._mongooseCache.conn) {
    return global._mongooseCache.conn;
  }

  if (!global._mongooseCache.promise) {
    global._mongooseCache.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    });
  }

  global._mongooseCache.conn = await global._mongooseCache.promise;
  return global._mongooseCache.conn;
}

// ─── Schemas & Models ────────────────────────────────────────────────────────

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: {
    type: String,
    enum: ["pending", "in-progress", "done"],
    default: "pending",
  },
  color: { type: String, default: "#ffffff" },
  userId: { type: String, required: false },
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
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // 7-day TTL
});

// Guard against model re-registration during hot-reload
export const TaskModel: mongoose.Model<any> =
  (mongoose.models["Task"] as mongoose.Model<any>) ||
  mongoose.model("Task", taskSchema);

export const UserModel: mongoose.Model<any> =
  (mongoose.models["User"] as mongoose.Model<any>) ||
  mongoose.model("User", userSchema);

export const SessionModel: mongoose.Model<any> =
  (mongoose.models["Session"] as mongoose.Model<any>) ||
  mongoose.model("Session", sessionSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTask(task: any) {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    color: task.color,
    userId: task.userId,
    created_at: task.created_at instanceof Date
      ? task.created_at.toISOString()
      : task.created_at,
  };
}
