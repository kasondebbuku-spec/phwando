"use client";

export default function PrintButton() {
  return (
    <button className="e-btn" type="button" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
