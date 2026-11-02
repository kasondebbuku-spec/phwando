import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="appbar">
        <a href="/dashboard" className="brand">
          <span className="brand-mark">P</span>Phwando
        </a>
        <nav aria-label="Organiser">
          <a href="/dashboard">Events</a>
          {user.role === "OWNER" && <Link href="/dashboard/events/new">New event</Link>}
        </nav>
        <div className="who">
          <span>
            {user.name} · {user.organization.name}
          </span>
          <form action={signOut}>
            <button className="btn" type="submit" style={{ padding: "5px 12px" }}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
