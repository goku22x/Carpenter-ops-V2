import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-3xl border-b-8 border-carpenter-red bg-carpenter-black p-6 text-white shadow-2xl">
        <h1 className="text-3xl font-black">Carpenter Operations Hub</h1>
        <p className="mt-2 text-sm text-slate-300">Production V2 foundation</p>
        <LoginForm />
      </section>
    </main>
  );
}
