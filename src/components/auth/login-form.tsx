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

  async function bootstrap(accessToken: string) {
    const res = await fetch("/api/bootstrap", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fullName })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Bootstrap failed.");
    }
  }

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

        if (data.session?.access_token) {
          await bootstrap(data.session.access_token);
          window.location.href = "/dashboard";
          return;
        }

        alert("Account created. If email confirmation is enabled, confirm your email then sign in.");
        setMode("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Sign-in should not depend on bootstrap.
      // Existing users with profiles go straight to the protected dashboard.
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
          <input className="input text-slate-950" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
      ) : null}

      <div>
        <label className="label text-slate-300">Email</label>
        <input className="input text-slate-950" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div>
        <label className="label text-slate-300">Password</label>
        <input
          className="input text-slate-950"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button className="btn-primary w-full" disabled={loading} onClick={submit}>
        {mode === "signin" ? "Sign In" : "Create Account"}
      </button>

      <button className="btn-secondary w-full" disabled={loading} onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Create Account" : "Back to Sign In"}
      </button>
    </div>
  );
}
