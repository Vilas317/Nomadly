import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/context/auth-context";

export const metadata: Metadata = {
  title: "Nomadly — Discover. Connect. Plan. Experience.",
  description: "A calmer way to discover remarkable places, meet fellow travellers and plan meaningful journeys.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider><AppShell>{children}</AppShell></AuthProvider></body></html>;
}
