// Zambian mobile numbers: 09X XXX XXXX or 07X XXX XXXX, optionally written as +260 9X... .
// We store and send them in the local 10-digit form (e.g. 0971234567), which is what Lenco uses.

export type Operator = "airtel" | "mtn" | "zamtel";

export function normalisePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("260")) d = d.slice(3);
  if (d.length === 9) d = "0" + d;
  if (!/^0[79][5-7]\d{7}$/.test(d)) return null;
  return d;
}

// Network prefixes: 097/077 Airtel, 096/076 MTN, 095/075 Zamtel.
export function detectOperator(phone: string): Operator | null {
  const p = phone.slice(2, 3);
  if (p === "7") return "airtel";
  if (p === "6") return "mtn";
  if (p === "5") return "zamtel";
  return null;
}

export function prettyPhone(phone: string): string {
  return phone.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}

export const OPERATOR_LABEL: Record<string, string> = {
  airtel: "Airtel Money",
  mtn: "MTN MoMo",
  zamtel: "Zamtel Kwacha",
  free: "Free RSVP",
};
