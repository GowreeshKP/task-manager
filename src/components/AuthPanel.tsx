import React, { useState } from "react";
import { User, LogIn, UserPlus, Key, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";

interface AuthPanelProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onContinueAsGuest: () => void;
}

export default function AuthPanel({ onLogin, onRegister, onContinueAsGuest }: AuthPanelProps) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Both username and password are required.");
      return;
    }
    setErrorMsg("");
    setIsLoading(true);

    try {
      if (isLoginView) {
        await onLogin(username.trim(), password);
      } else {
        await onRegister(username.trim(), password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-md mx-auto"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative bg-amber-50 border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
        style={{
          transform: "rotateX(2deg) rotateY(-2deg)",
        }}
      >
        {/* Push Pin decoration */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 border-2 border-slate-900 w-5 h-5 rounded-full shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] z-10" />

        {/* Header Title with 3D Text effect */}
        <div className="text-center mb-6">
          <div className="inline-block relative">
            <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tight relative z-10 select-none">
              {isLoginView ? "Task Manager" : "Join System"}
            </h2>
            <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] text-3xl font-black uppercase text-amber-300 tracking-tight select-none">
              {isLoginView ? "Task Manager" : "Join System"}
            </div>
          </div>
          <p className="text-slate-600 text-xs mt-1.5 font-bold">
            {isLoginView ? "Sign in to keep your tasks in sync" : "Create an account to persist task notes"}
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-xs font-semibold p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
              Username
            </label>
            <div className="relative border-2 border-slate-950 rounded-lg overflow-hidden bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cozy_developer"
                className="w-full pl-10 pr-3 py-2 bg-transparent text-slate-800 font-bold focus:outline-none placeholder-slate-400"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
              Password
            </label>
            <div className="relative border-2 border-slate-950 rounded-lg overflow-hidden bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Key className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 bg-transparent text-slate-800 font-bold focus:outline-none placeholder-slate-400"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3D Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-amber-300 hover:bg-amber-400 text-slate-900 border-2 border-slate-900 font-black rounded-lg shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all"
          >
            {isLoginView ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isLoading
              ? "Authenticating..."
              : isLoginView
              ? "Sign In"
              : "Register Account"}
          </button>
        </form>

        {/* View Switcher */}
        <div className="mt-5 pt-4 border-t-2 border-slate-900/10 text-center space-y-3">
          <p className="text-slate-600 text-xs font-bold">
            {isLoginView ? "New to Task Manager?" : "Already have an account?"}
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setErrorMsg("");
              }}
              className="ml-1 text-indigo-600 underline font-black hover:text-indigo-800"
            >
              {isLoginView ? "Sign Up Free" : "Log In Here"}
            </button>
          </p>

          <div className="flex items-center justify-center gap-2 text-slate-300 select-none">
            <span className="h-[2px] w-8 bg-slate-300" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">or</span>
            <span className="h-[2px] w-8 bg-slate-300" />
          </div>

          {/* Continue as Guest Button */}
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-900 font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all text-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            Continue as Guest (Sandbox)
          </button>
        </div>
      </div>
    </div>
  );
}
