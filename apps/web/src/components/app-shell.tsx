"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Users, Map, Sparkles, UserRound, Menu, X, Mountain, CalendarDays } from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/", label: "Home", icon: Compass },
  { href: "/explore", label: "Explore", icon: Map },
  { href: "/connect", label: "Connect", icon: Users },
  { href: "/trips", label: "Trips", icon: Mountain },
  { href: "/festivals", label: "Festivals", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-root">
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark">n</span><span>nomadly<span className="brand-period">.</span></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.slice(1, 5).map(item => <Link key={item.href} href={item.href} className={pathname === item.href ? "nav-link active" : "nav-link"}>{item.label}</Link>)}
        </nav>
        <div className="top-actions"><Link href="/profile" className="profile-link">Your profile</Link><button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button></div>
      </header>
      {menuOpen && <div className="mobile-menu">{nav.map(item => <Link onClick={() => setMenuOpen(false)} key={item.href} href={item.href}><item.icon size={17} />{item.label}</Link>)}</div>}
      <main className="main-content">{children}</main>
      <footer className="footer"><div className="footer-brand">nomadly<span className="brand-period">.</span></div><span>Discover. Connect. Experience.</span><span>Built for the curious.</span></footer>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{nav.slice(0, 5).map(item => <Link key={item.href} href={item.href} className={pathname === item.href ? "mobile-nav-item active" : "mobile-nav-item"}><item.icon size={19} /><span>{item.label}</span></Link>)}</nav>
    </div>
  );
}
