import { requireOwner } from "@/lib/auth";
import NewEventForm from "@/components/NewEventForm";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  const user = await requireOwner();
  return (
    <div className="narrow" style={{ maxWidth: 760 }}>
      <div>
        <a href="/dashboard" className="muted" style={{ fontSize: ".85rem" }}>
          ← Events
        </a>
        <h1>New event</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          You get a guest page with registration, mobile-money payment, QR tickets and a message wall.
        </p>
      </div>
      <NewEventForm defaultHost={user.organization.name} />
    </div>
  );
}
