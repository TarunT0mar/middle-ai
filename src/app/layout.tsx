import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Middle AI — Thoughtful replies for every customer", template: "%s · Middle AI" },
  description: "A customer support assistant for small businesses on WhatsApp. Grounded in your approved business information.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen antialiased">{children}</body></html>;
}
