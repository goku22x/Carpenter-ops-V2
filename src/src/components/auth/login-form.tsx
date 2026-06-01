"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function submit() {
    setLoading(true);
    setStatus("Starting...");

    try {
      if (mode === "signup") {
        setStatus("Creating account...");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (error) throw error;

        if (data.session) {
          setStatus("Account created. Opening dashboard...");
          window.location.href = "/dashboard";
          return;
        }

        setStatus("Account created. Confirm email if required, then sign in.");
        setMode("signin");
        return;
      }

      setStatus("Signing in...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error("Supabase did not return a session.");
      }

      setStatus("Signed in. Checking session cookie...");

      const sessionCheck = await fetch("/api/debug-session", {
        method: "GET",
        cache: "no-store"
      });

      const sessionJson = await sessionCheck.json().catch(() => null);

      if (!sessionCheck.ok) {
        throw new Error(sessionJson?.error ?? "Session debug endpoint failed.");
      }

      setStatus(
        `Client signed in. Server sees user: ${sessionJson?.userEmail ?? "NO USER"}. Opening dashboard...`
      );

      window.location.href = "/dashboard";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setStatus(`ERROR: ${message}`);
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {mode === "signup" ? (
        <div>
          <label className="label text-slate-300">Full Name</label>
          <input
            className="input text-slate-950"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
      ) : null}

      <div>
        <label className="label text-slate-300">Email</label>
        <input
          className="input text-slate-950"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div>
        <label className="label text-slate-300">Password</label>
        <input
          className="input text-slate-950"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {status ? (
        <div className="rounded-xl bg-white/10 p-3 text-sm font-bold text-white">
          {status}
        </div>
      ) : null}

      <button className="btn-primary w-full" disabled={loading} onClick={submit}>
        {loading ? "Working..." : mode === "signin" ? "Sign In" : "Create Account"}
      </button>

      <button
        className="btn-secondary w-full"
        disabled={loading}
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Create Account" : "Back to Sign In"}
      </button>
    </div>
  );
}
