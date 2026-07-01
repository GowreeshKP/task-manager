import React, { useState } from "react";
import { Sparkles, Pin, CheckCircle, Calendar, Plus, ChevronUp, ChevronDown } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import { TaskStatus } from "../types";

interface TaskFormProps {
  onAddTask: (task: { title: string; description: string; status: TaskStatus; color: string }) => Promise<void>;
  isGeneratingAI: boolean;
  onGenerateAI: (title: string) => Promise<string>;
}

const KEEP_COLORS = [
  { name: "White", value: "#ffffff", textClass: "text-slate-800" },
  { name: "Rose Peach", value: "#ffccd5", textClass: "text-slate-800" },
  { name: "Cream Orange", value: "#ffe5ec", textClass: "text-slate-800" },
  { name: "Soft Yellow", value: "#fefae0", textClass: "text-slate-800" },
  { name: "Mint Green", value: "#d8f3dc", textClass: "text-slate-800" },
  { name: "Teal Cyan", value: "#e8f1f5", textClass: "text-slate-800" },
  { name: "Sky Blue", value: "#e0f2fe", textClass: "text-slate-800" },
  { name: "Lavender Lavender", value: "#fae0e4", textClass: "text-slate-800" },
  { name: "Clay Brown", value: "#f5ebe0", textClass: "text-slate-800" },
];

export default function TaskForm({ onAddTask, isGeneratingAI, onGenerateAI }: TaskFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [color, setColor] = useState("#ffffff");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setErrorMsg("");
  };

  const handleAiGenerate = async () => {
    if (!title.trim()) {
      setErrorMsg("Please enter a task title first to generate an AI description.");
      return;
    }
    setErrorMsg("");
    setIsAiLoading(true);
    try {
      const richDesc = await onGenerateAI(title);
      setDescription(richDesc);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate AI description.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Task title is required.");
      return;
    }

    try {
      await onAddTask({
        title: title.trim(),
        description: description,
        status,
        color,
      });

      // Reset state
      setTitle("");
      setDescription("");
      setStatus("pending");
      setColor("#ffffff");
      setIsExpanded(false);
      setErrorMsg("");
    } catch (err: any) {
      setErrorMsg(err.message || "Could not add task.");
    }
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto mb-8 transition-all duration-300"
      style={{ perspective: "1000px" }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: color,
          transform: "rotateX(1deg) rotateY(-1deg)",
        }}
        className="relative border-4 border-slate-900 rounded-xl p-4 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
      >
        {/* Keep pin decoration */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 border-2 border-slate-900 w-4 h-4 rounded-full shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] z-10" />

        {/* Closed / Small View */}
        {!isExpanded ? (
          <div className="flex items-center justify-between cursor-text" onClick={handleExpand}>
            <span className="text-slate-500 font-medium select-none">Take a new task note...</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1.5 rounded-lg border-2 border-slate-900 bg-amber-300 hover:bg-amber-400 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all"
                title="Create task"
              >
                <Plus className="w-5 h-5 text-slate-900" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded View */
          <div className="space-y-4 animate-fadeIn">
            {/* Title & Close Row */}
            <div className="flex items-start justify-between gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task Title"
                className="w-full font-bold text-lg bg-transparent border-b-2 border-transparent focus:border-slate-800 focus:outline-none pb-1 placeholder-slate-400 text-slate-800"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCollapse}
                className="p-1 rounded-lg border-2 border-slate-900 bg-slate-200 hover:bg-slate-300 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all"
                title="Collapse"
              >
                <ChevronUp className="w-4 h-4 text-slate-800" />
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-100 border-2 border-rose-800 text-rose-800 text-xs font-semibold p-2 rounded-lg animate-pulse">
                {errorMsg}
              </div>
            )}

            {/* Description Editor Label & AI Sparkle Button */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Description Details (Rich Text)
              </label>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={isAiLoading || !title}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all ${
                  !title
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 shadow-none"
                    : "bg-indigo-300 hover:bg-indigo-400 text-slate-900 active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? "animate-spin text-indigo-700" : "text-amber-600 animate-pulse"}`} />
                {isAiLoading ? "AI Writing..." : "AI Auto-Generate"}
              </button>
            </div>

            {/* Rich Text Editor */}
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Start drafting rich task instructions, next steps, success criteria..."
            />

            {/* Color Palette Selector */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Card Background Color
              </span>
              <div className="flex flex-wrap gap-2">
                {KEEP_COLORS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setColor(col.value)}
                    style={{ backgroundColor: col.value }}
                    className={`w-7 h-7 rounded-full border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all transform hover:scale-110 relative ${
                      color === col.value ? "ring-2 ring-indigo-500 scale-105" : ""
                    }`}
                    title={col.name}
                  >
                    {color === col.value && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-slate-900">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Status & Add Task Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t-2 border-slate-900/10">
              {/* Status Select */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Status:</span>
                <div className="flex border-2 border-slate-900 rounded-lg overflow-hidden shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <button
                    type="button"
                    onClick={() => setStatus("pending")}
                    className={`px-3 py-1 text-xs font-bold transition-all ${
                      status === "pending"
                        ? "bg-rose-400 text-slate-900"
                        : "bg-white hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("in-progress")}
                    className={`px-3 py-1 text-xs font-bold border-x-2 border-slate-900 transition-all ${
                      status === "in-progress"
                        ? "bg-amber-300 text-slate-900"
                        : "bg-white hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("done")}
                    className={`px-3 py-1 text-xs font-bold transition-all ${
                      status === "done"
                        ? "bg-emerald-400 text-slate-900"
                        : "bg-white hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="flex items-center justify-center gap-1 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-500 text-slate-900 border-2 border-slate-900 font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all self-end sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
