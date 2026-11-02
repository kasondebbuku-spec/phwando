// Money is stored in ngwee (K1 = 100 ngwee) so amounts are always whole numbers.
export function kwacha(ngwee: number): string {
  if (ngwee === 0) return "Free";
  const k = ngwee / 100;
  return "K" + k.toLocaleString("en-GB", { minimumFractionDigits: k % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export const TZ = "Africa/Lusaka";

export function longDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}

export function shortDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
}

export function clock(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export function fullTitle(e: { titleLead: string; title: string }): string {
  return e.titleLead ? `${e.titleLead} ${e.title}` : e.title;
}
