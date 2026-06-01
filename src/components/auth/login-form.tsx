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

  async function submit() {
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (error) throw error;

        if (data.session) {
          window.location.href = "/dashboard";
          return;
        }

        alert("Account created. If email confirmation is enabled, confirm your email, then sign in.");
        setMode("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      window.location.href = "/dashboard";
    } catch (err) {
      alert(err instanceof Error ? err.message : "Authentication failed.");
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
