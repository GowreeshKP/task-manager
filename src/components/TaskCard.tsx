import React, { useState } from "react";
import { Task, TaskStatus } from "../types";
import { Trash2, Edit2, Check, X, Palette, HelpCircle, CheckCircle2, PlayCircle, Clock, Sparkles } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

interface TaskCardProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onGenerateAI: (title: string) => Promise<string>;
}

const KEEP_COLORS = [
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

export default function TaskCard({ task, onUpdateTask, onDeleteTask, onGenerateAI }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const id = task.id || task._id || "";

  // 3D hover effects
  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case "done":
        return {
          bg: "bg-emerald-300",
          border: "border-emerald-800",
          text: "text-emerald-900",
          label: "Done",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "in-progress":
        return {
          bg: "bg-amber-300",
          border: "border-amber-800",
          text: "text-amber-950",
          label: "In Progress",
          icon: <PlayCircle className="w-3.5 h-3.5" />,
        };
      default:
        return {
          bg: "bg-rose-300",
          border: "border-rose-800",
          text: "text-rose-900",
          label: "Pending",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
    }
  };

  const statusStyle = getStatusStyle(task.status);

  const handleSave = async () => {
    if (!editedTitle.trim()) {
      setCardError("Title cannot be empty");
      return;
    }
    try {
      setCardError("");
      await onUpdateTask(id, {
        title: editedTitle.trim(),
        description: editedDescription,
      });
      setIsEditing(false);
    } catch (err: any) {
      setCardError(err.message || "Failed to save edits");
    }
  };

  const handleCancel = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description);
    setIsEditing(false);
    setCardError("");
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await onUpdateTask(id, { status: newStatus });
    } catch (err: any) {
      console.error("Failed to update status", err);
    }
  };

  const handleColorChange = async (newColor: string) => {
    try {
      await onUpdateTask(id, { color: newColor });
      setShowColorPicker(false);
    } catch (err: any) {
      console.error("Failed to update color", err);
    }
  };

  const handleAiImprove = async () => {
    setIsAiLoading(true);
    setCardError("");
    try {
      const richDesc = await onGenerateAI(editedTitle);
      setEditedDescription(richDesc);
    } catch (err: any) {
      setCardError(err.message || "Failed to generate AI description");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: task.color || "#ffffff",
        perspective: "1000px",
      }}
      className="group relative border-4 border-slate-900 rounded-xl p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] hover:shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 flex flex-col h-full min-h-[250px]"
    >
      {/* 3D Push Pin Decoration */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-rose-500 border-2 border-slate-900 w-4.5 h-4.5 rounded-full shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] z-10 transition-transform group-hover:scale-110" />

      {isEditing ? (
        /* Editing State */
        <div className="space-y-4 flex-grow flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full font-bold text-base bg-transparent border-b-2 border-slate-800 focus:outline-none pb-0.5 text-slate-800"
              placeholder="Task Title"
            />
            <button
              onClick={handleAiImprove}
              disabled={isAiLoading}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-indigo-300 hover:bg-indigo-400 text-slate-900 rounded-md border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 whitespace-nowrap"
              title="Auto-generate description with Gemini AI"
            >
              <Sparkles className={`w-3 h-3 ${isAiLoading ? "animate-spin" : ""}`} />
              AI Describe
            </button>
          </div>

          {cardError && <span className="text-xs text-rose-700 font-bold">{cardError}</span>}

          <RichTextEditor
            value={editedDescription}
            onChange={setEditedDescription}
            placeholder="Edit details..."
            className="text-sm flex-grow min-h-[140px]"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-400 hover:bg-emerald-500 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>
      ) : (
        /* Normal Display State */
        <div className="flex flex-col h-full flex-grow">
          {/* Card Header: Title & Status Pill */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="font-extrabold text-lg text-slate-900 leading-tight tracking-tight break-words text-left">
              {task.title}
            </h3>
            {/* Status Pill Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg border-2 ${statusStyle.border} ${statusStyle.bg} ${statusStyle.text} shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}
            >
              {statusStyle.icon}
              {statusStyle.label}
            </div>
          </div>

          {/* Card Body: HTML Rich Text */}
          <div className="flex-grow text-left text-sm text-slate-700 prose prose-sm max-w-none overflow-y-auto max-h-[160px] pr-1 scrollbar-thin mb-4">
            {task.description ? (
              <div
                dangerouslySetInnerHTML={{ __html: task.description }}
                className="prose prose-slate prose-sm text-slate-800 break-words"
              />
            ) : (
              <p className="italic text-slate-400 text-xs">No description provided.</p>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-auto pt-3 border-t border-slate-900/10 flex items-center justify-between gap-2 flex-wrap">
            {/* Left: Quick Status Update & Palette Controls */}
            <div className="flex items-center gap-1.5">
              {/* Change status selector */}
              <div className="flex border-2 border-slate-900 rounded-lg overflow-hidden shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] bg-white">
                <button
                  onClick={() => handleStatusChange("pending")}
                  className={`px-1.5 py-1 text-[10px] font-bold ${
                    task.status === "pending"
                      ? "bg-rose-400 text-slate-900"
                      : "hover:bg-slate-100 text-slate-500"
                  }`}
                  title="Mark Pending"
                >
                  Pend
                </button>
                <button
                  onClick={() => handleStatusChange("in-progress")}
                  className={`px-1.5 py-1 text-[10px] font-bold border-x-2 border-slate-900 ${
                    task.status === "in-progress"
                      ? "bg-amber-300 text-slate-900"
                      : "hover:bg-slate-100 text-slate-500"
                  }`}
                  title="Mark In-Progress"
                >
                  Prog
                </button>
                <button
                  onClick={() => handleStatusChange("done")}
                  className={`px-1.5 py-1 text-[10px] font-bold ${
                    task.status === "done"
                      ? "bg-emerald-400 text-slate-900"
                      : "hover:bg-slate-100 text-slate-500"
                  }`}
                  title="Mark Done"
                >
                  Done
                </button>
              </div>

              {/* Palette button */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1 rounded bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all"
                  title="Change color"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>

                {showColorPicker && (
                  <div className="absolute bottom-8 left-0 bg-white border-2 border-slate-900 p-2 rounded-lg shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-20 flex gap-1.5 flex-wrap w-[140px]">
                    {KEEP_COLORS.map((col) => (
                      <button
                        key={col.value}
                        onClick={() => handleColorChange(col.value)}
                        style={{ backgroundColor: col.value }}
                        className={`w-5 h-5 rounded-full border-2 border-slate-900 hover:scale-110 transform transition-all ${
                          task.color === col.value ? "ring-2 ring-indigo-500" : ""
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Edit & Delete Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 rounded bg-amber-300 hover:bg-amber-400 text-slate-900 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all"
                title="Edit task"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteTask(id)}
                className="p-1 rounded bg-rose-400 hover:bg-rose-500 text-slate-900 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all"
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
