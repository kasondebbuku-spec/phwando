import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, currentUser } from "@/lib/auth";

export const metadata = { title: "Organiser sign in" };

async function signIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  // Compare even when the user doesn't exist so response time doesn't reveal which emails are registered.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok) redirect("/login?error=1");
  await createSession(user.id);
  redirect("/dashboard");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <main className="page">
      <div className="narrow" style={{ maxWidth: 400, paddingTop: "8vh" }}>
        <a href="/" className="brand">
          <span className="brand-mark">P</span>Phwando
        </a>
        <h1>Organiser sign in</h1>
        <form action={signIn} className="card">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && <p className="error">That email and password don&apos;t match. Check them and try again.</p>}
          <button className="btn primary" type="submit">
            Sign in
          </button>
        </form>
        <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>
          Looking for your ticket? <a href="/tickets">Find it with your phone number</a>.
        </p>
      </div>
    </main>
  );
}
