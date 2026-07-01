import React, { useState, useEffect, useMemo } from "react";
import {
  List,
  Grid,
  Search,
  LogOut,
  User,
  Layout,
  SlidersHorizontal,
  FolderKanban,
  CheckCircle2,
  PlayCircle,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Task, TaskStatus, User as UserType } from "./types";
import TaskForm from "./components/TaskForm";
import TaskCard from "./components/TaskCard";
import AuthPanel from "./components/AuthPanel";

const COLORS_PRESETS = [
  { name: "All Colors", value: "all" },
  { name: "White", value: "#ffffff" },
  { name: "Rose Peach", value: "#ffccd5" },
  { name: "Cream Orange", value: "#ffe5ec" },
  { name: "Soft Yellow", value: "#fefae0" },
  { name: "Mint Green", value: "#d8f3dc" },
  { name: "Teal Cyan", value: "#e8f1f5" },
  { name: "Sky Blue", value: "#e0f2fe" },
  { name: "Lavender", value: "#fae0e4" },
  { name: "Clay Brown", value: "#f5ebe0" },
];

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters & Views state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch tasks
  const fetchTasks = async (currentUser: UserType | null, guestMode: boolean) => {
    if (!currentUser && !guestMode) return;
    setIsLoading(true);
    setErrorMsg("");

    const headers: HeadersInit = {};
    if (currentUser?.token) {
      headers["Authorization"] = `Bearer ${currentUser.token}`;
    }

    try {
      const response = await fetch("/api/tasks", { headers });
      if (!response.ok) throw new Error("Failed to load tasks");
      const data = await response.json();
      setTasks(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to fetch tasks from the server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Validate stored session on mount before fetching
  useEffect(() => {
    const saved = localStorage.getItem("task_cabin_user");
    const guest = localStorage.getItem("task_cabin_guest") === "true";
    if (saved) {
      const parsed = JSON.parse(saved);
      fetch("/api/tasks", { headers: { Authorization: `Bearer ${parsed.token}` } })
        .then((r) => {
          if (r.ok || r.status !== 401) {
            setUser(parsed);
          } else {
            localStorage.removeItem("task_cabin_user");
          }
        })
        .catch(() => setUser(parsed))
        .finally(() => setAuthReady(true));
    } else {
      setIsGuest(guest);
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (authReady) fetchTasks(user, isGuest);
  }, [user, isGuest, authReady]);

  // Auth Handlers
  const handleLogin = async (username: string, password: string) => {
    setErrorMsg("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    setUser(data.user);
    setIsGuest(false);
    localStorage.setItem("task_cabin_user", JSON.stringify(data.user));
    localStorage.removeItem("task_cabin_guest");
  };

  const handleRegister = async (username: string, password: string) => {
    setErrorMsg("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    setUser(data.user);
    setIsGuest(false);
    localStorage.setItem("task_cabin_user", JSON.stringify(data.user));
    localStorage.removeItem("task_cabin_guest");
  };

  const handleContinueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    localStorage.setItem("task_cabin_guest", "true");
    localStorage.removeItem("task_cabin_user");
  };

  const handleLogout = async () => {
    if (user?.token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${user.token}` },
        });
      } catch (e) {
        console.error("Logout request error", e);
      }
    }
    setUser(null);
    setIsGuest(false);
    setTasks([]);
    localStorage.removeItem("task_cabin_user");
    localStorage.removeItem("task_cabin_guest");
  };

  // Task Handlers
  const handleAddTask = async (taskData: {
    title: string;
    description: string;
    status: TaskStatus;
    color: string;
  }) => {
    setErrorMsg("");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (user?.token) {
      headers["Authorization"] = `Bearer ${user.token}`;
    }

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers,
      body: JSON.stringify(taskData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not add task");
    }

    setTasks((prev) => [data, ...prev]);
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    setErrorMsg("");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (user?.token) {
      headers["Authorization"] = `Bearer ${user.token}`;
    }

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not update task");
      }

      setTasks((prev) => prev.map((t) => (t.id === id || t._id === id ? data : t)));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update task");
      throw err;
    }
  };

  const handleDeleteTask = async (id: string) => {
    setErrorMsg("");
    const headers: HeadersInit = {};
    if (user?.token) {
      headers["Authorization"] = `Bearer ${user.token}`;
    }

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not delete task");
      }

      setTasks((prev) => prev.filter((t) => t.id !== id && t._id !== id));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete task");
    }
  };

  // AI Generation from Title
  const handleGenerateAI = async (title: string): Promise<string> => {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Gemini description generation failed");
    }

    return data.description;
  };

  // Remove HTML tags for text search comparison
  const stripHtml = (htmlStr: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = htmlStr;
    return tmp.textContent || tmp.innerText || "";
  };

  // Filter Tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Status Filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }
      // 2. Color Filter
      if (colorFilter !== "all" && task.color !== colorFilter) {
        return false;
      }
      // 3. Search Query Filter (Title or stripped description content)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const textDesc = stripHtml(task.description).toLowerCase();
        const matchesDesc = textDesc.includes(query);
        return matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [tasks, statusFilter, colorFilter, searchQuery]);

  // Statistics
  const statistics = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const progress = tasks.filter((t) => t.status === "in-progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    return { total, pending, progress, done };
  }, [tasks]);

  return (
    <div className="h-screen bg-[#fdfdfd] flex flex-col font-sans text-slate-800 overflow-hidden">
      {/* Blueprint background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Main Header / Top Navigation Bar */}
      <header className="h-16 flex items-center px-6 bg-white border-b border-slate-200 z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl shadow-[4px_4px_0px_#000] flex items-center justify-center font-black text-white text-xl italic select-none">
            TM
          </div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">
            Task Manager
          </h1>
          {isGuest && (
            <span className="text-[9px] bg-rose-100 text-rose-800 border border-slate-900 font-extrabold px-1.5 py-0.5 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider ml-1">
              Guest Sandbox
            </span>
          )}
        </div>

        {/* Header Search Bar - only shown if logged in or guest */}
        {(user || isGuest) && (
          <div className="ml-8 md:ml-12 flex-1 max-w-xl hidden sm:block">
            <div className="relative flex items-center bg-slate-100 rounded-lg px-4 py-2 border-2 border-transparent focus-within:border-black focus-within:bg-white transition-all shadow-inner">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search your creative workspace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:ring-0 ml-3 w-full text-sm font-medium outline-none text-slate-800"
              />
            </div>
          </div>
        )}

        {/* User Status / Actions */}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 border-2 border-black bg-indigo-100 rounded-xl px-3.5 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-xs font-black">
                <User className="w-3.5 h-3.5" />
                <span>{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-rose-300 hover:bg-rose-400 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all text-slate-900"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : isGuest ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-300 hover:bg-rose-400 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all text-xs font-black text-slate-900 uppercase"
            >
              <LogOut className="w-4 h-4" />
              Exit Sandbox
            </button>
          ) : null}
        </div>
      </header>

      {/* Main Container - Sidebar & Content Split */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* If Not Authenticated */}
        {!user && !isGuest ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50 overflow-y-auto">
            <AuthPanel
              onLogin={handleLogin}
              onRegister={handleRegister}
              onContinueAsGuest={handleContinueAsGuest}
            />
          </div>
        ) : (
          /* Sidebar Layout */
          <>
            <aside className="w-64 border-r border-slate-200 hidden md:flex flex-col p-5 bg-slate-50 shrink-0 select-none overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 px-4">
                Categories & States
              </p>
              <nav className="space-y-1.5 flex-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-2 transition-all text-left text-sm font-bold rounded-xl ${
                    statusFilter === "all"
                      ? "bg-white border-black shadow-[4px_4px_0px_#000] text-slate-900"
                      : "bg-transparent border-transparent text-slate-500 hover:text-black hover:bg-slate-100"
                  }`}
                >
                  <Layout className="w-5 h-5" />
                  All Tasks
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-2 transition-all text-left text-sm font-bold rounded-xl ${
                    statusFilter === "pending"
                      ? "bg-rose-100 border-black shadow-[4px_4px_0px_#000] text-rose-900"
                      : "bg-transparent border-transparent text-slate-500 hover:text-black hover:bg-slate-100"
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter("in-progress")}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-2 transition-all text-left text-sm font-bold rounded-xl ${
                    statusFilter === "in-progress"
                      ? "bg-amber-100 border-black shadow-[4px_4px_0px_#000] text-amber-900"
                      : "bg-transparent border-transparent text-slate-500 hover:text-black hover:bg-slate-100"
                  }`}
                >
                  <PlayCircle className="w-5 h-5" />
                  In Progress
                </button>
                <button
                  onClick={() => setStatusFilter("done")}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-2 transition-all text-left text-sm font-bold rounded-xl ${
                    statusFilter === "done"
                      ? "bg-emerald-100 border-black shadow-[4px_4px_0px_#000] text-emerald-900"
                      : "bg-transparent border-transparent text-slate-500 hover:text-black hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Completed
                </button>
              </nav>

              {/* Sidebar AI insight box matching Vercel/Render theme */}
              <div className="mt-auto p-4 bg-black rounded-2xl text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                  Gemini Insight
                </p>
                <p className="text-xs leading-relaxed font-medium italic opacity-90 text-left">
                  "Drafting descriptions? Try clicking 'AI Auto-Generate' to let Gemini compose rich text task guides instantly."
                </p>
              </div>
            </aside>

            {/* Main Content Workspace */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
              {/* Horizontal search bar on mobile screens */}
              <div className="mb-4 sm:hidden">
                <div className="relative flex items-center bg-slate-100 rounded-xl px-3.5 py-2 border-2 border-slate-200">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search workspace..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 ml-2 w-full text-xs font-semibold outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Quick statistics dashboard */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 select-none shrink-0">
                <div className="bg-white border-2 border-black p-3.5 rounded-xl shadow-[3px_3px_0px_#000] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Tasks</span>
                    <p className="text-2xl font-black text-slate-900">{statistics.total}</p>
                  </div>
                  <Layout className="w-8 h-8 text-slate-200" />
                </div>
                <div className="bg-rose-100 border-2 border-black p-3.5 rounded-xl shadow-[3px_3px_0px_#000] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-800">Pending</span>
                    <p className="text-2xl font-black text-rose-950">{statistics.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-rose-300" />
                </div>
                <div className="bg-amber-100 border-2 border-black p-3.5 rounded-xl shadow-[3px_3px_0px_#000] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-800">In Progress</span>
                    <p className="text-2xl font-black text-amber-950">{statistics.progress}</p>
                  </div>
                  <PlayCircle className="w-8 h-8 text-amber-300" />
                </div>
                <div className="bg-emerald-100 border-2 border-black p-3.5 rounded-xl shadow-[3px_3px_0px_#000] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800">Completed</span>
                    <p className="text-2xl font-black text-emerald-950">{statistics.done}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                </div>
              </div>

              {/* Rich Task Creator Form Component */}
              <div className="shrink-0">
                <TaskForm
                  onAddTask={handleAddTask}
                  isGeneratingAI={false}
                  onGenerateAI={handleGenerateAI}
                />
              </div>

              {/* Error messages notifications */}
              {errorMsg && (
                <div className="mb-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-3 shadow-[3px_3px_0px_#000] shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <div className="flex-grow text-left">
                    <p className="font-bold">An error occurred</p>
                    <p className="text-[10px] opacity-90">{errorMsg}</p>
                  </div>
                  <button
                    onClick={() => setErrorMsg("")}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-[10px] rounded border border-slate-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Workspace Filters and Layout Tools */}
              <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 shrink-0 select-none">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status filter (on mobile only since desktop has sidebar) */}
                  <div className="flex md:hidden border-2 border-black rounded-lg overflow-hidden shadow-[1.5px_1.5px_0px_#000]">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-2.5 py-1 text-xs font-bold transition-all ${
                        statusFilter === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-600"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter("pending")}
                      className={`px-2.5 py-1 text-xs font-bold border-l-2 border-black transition-all ${
                        statusFilter === "pending" ? "bg-rose-400 text-slate-900" : "bg-white text-slate-600"
                      }`}
                    >
                      Pend
                    </button>
                    <button
                      onClick={() => setStatusFilter("in-progress")}
                      className={`px-2.5 py-1 text-xs font-bold border-l-2 border-black transition-all ${
                        statusFilter === "in-progress" ? "bg-amber-300 text-slate-900" : "bg-white text-slate-600"
                      }`}
                    >
                      Prog
                    </button>
                    <button
                      onClick={() => setStatusFilter("done")}
                      className={`px-2.5 py-1 text-xs font-bold border-l-2 border-black transition-all ${
                        statusFilter === "done" ? "bg-emerald-400 text-slate-900" : "bg-white text-slate-600"
                      }`}
                    >
                      Done
                    </button>
                  </div>

                  {/* Color Preset Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500">Card Color:</span>
                    <select
                      value={colorFilter}
                      onChange={(e) => setColorFilter(e.target.value)}
                      className="border-2 border-black rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 bg-white focus:outline-none shadow-[1.5px_1.5px_0px_#000] cursor-pointer"
                    >
                      {COLORS_PRESETS.map((col) => (
                        <option key={col.value} value={col.value}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* View layout toggler (Grid / List) */}
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[10px] font-black uppercase text-slate-500">Layout:</span>
                  <div className="flex border-2 border-black rounded-lg overflow-hidden shadow-[1.5px_1.5px_0px_#000] bg-white">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1 transition-all ${
                        viewMode === "grid" ? "bg-yellow-400 text-slate-900" : "hover:bg-slate-50 text-slate-400"
                      }`}
                      title="Grid layout"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1 border-l-2 border-black transition-all ${
                        viewMode === "list" ? "bg-yellow-400 text-slate-900" : "hover:bg-slate-50 text-slate-400"
                      }`}
                      title="List layout"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Task list board container */}
              <div className="w-full">
                {isLoading ? (
                  <div className="py-24 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-yellow-400 shadow-[3px_3px_0px_#000] inline-block mb-3" />
                    <p className="text-slate-500 font-extrabold text-xs uppercase tracking-wider">
                      Syncing with Database...
                    </p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl py-16 px-4 text-center max-w-lg mx-auto">
                    <div className="inline-block bg-slate-100 border-2 border-black rounded-full p-4 mb-4 shadow-[3px_3px_0px_#000]">
                      <SlidersHorizontal className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-800 mb-1">No Task Notes Found</h3>
                    <p className="text-slate-500 text-xs font-semibold mb-4">
                      {tasks.length === 0
                        ? "Your task workspace is currently empty! Create a task above to get started."
                        : "No tasks match your active filters or searches."}
                    </p>
                    {tasks.length > 0 && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setColorFilter("all");
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all uppercase"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  /* Dynamic Task List Grid rendering */
                  <div
                    className={`transition-all duration-300 pb-12 ${
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                        : "space-y-6 max-w-3xl mx-auto"
                    }`}
                  >
                    {filteredTasks.map((task) => (
                      <div key={task.id || task._id}>
                        <TaskCard
                          task={task}
                          onUpdateTask={handleUpdateTask}
                          onDeleteTask={handleDeleteTask}
                          onGenerateAI={handleGenerateAI}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </main>
          </>
        )}
      </div>

      {/* Footer Status Bar with Live Sync info */}
      <footer className="h-8 bg-slate-900 text-slate-400 flex items-center px-4 justify-between text-[10px] font-bold uppercase tracking-widest shrink-0 z-10 select-none">
        <div className="flex gap-4">
          <span>Database: Connected</span>
          <span className="text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live Sync Active
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="hidden sm:inline">Active Cards: {tasks.length}</span>
          <div className="h-4 w-12 bg-slate-700 rounded-sm overflow-hidden relative">
            <div className="absolute left-0 top-0 h-full w-4/5 bg-yellow-400 animate-pulse" />
          </div>
          <span>Memory: OK</span>
        </div>
      </footer>
    </div>
  );
}
