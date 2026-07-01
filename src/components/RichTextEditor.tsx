import React, { useRef, useEffect } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Type, Trash2, AlignLeft, Highlighter } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write task details...",
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Load initial value if it differs from editor content (prevent cursor reset)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, arg: string = "") => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  return (
    <div className={`flex flex-col border-2 border-slate-800 rounded-lg overflow-hidden bg-white/80 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] transition-all ${className}`}>
      {/* 3D Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b-2 border-slate-800">
        <button
          type="button"
          onClick={() => executeCommand("bold")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("italic")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("underline")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("strikeThrough")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Strikethrough"
        >
          <span className="line-through font-bold text-xs px-0.5">ab</span>
        </button>
        <div className="w-[2px] h-6 bg-slate-300 mx-1" />
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h2>")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Heading"
        >
          <Type className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-[2px] h-6 bg-slate-300 mx-1" />
        <button
          type="button"
          onClick={() => executeCommand("hiliteColor", "yellow")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Highlight Yellow"
        >
          <Highlighter className="w-4 h-4 text-amber-500" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("removeFormat")}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 active:translate-y-0.5 border border-transparent active:border-slate-800 transition-all"
          title="Clear Formatting"
        >
          <Trash2 className="w-4 h-4 text-rose-500" />
        </button>
      </div>

      {/* Editor Canvas */}
      <div className="relative min-h-[160px] bg-white">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="w-full min-h-[160px] p-3 text-slate-800 focus:outline-none overflow-y-auto prose prose-sm max-w-none text-left"
          style={{ minHeight: "160px" }}
        />
        {!value && (
          <div className="absolute top-3 left-3 text-slate-400 pointer-events-none select-none text-sm italic">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
