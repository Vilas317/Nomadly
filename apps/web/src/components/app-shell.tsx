"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Users, Map, UserRound, Menu, X, Mountain, CalendarDays, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";

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
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { user, loading, signOut } = useAuth();
  const isAuthPage = ["/login", "/register", "/verify-email"].includes(pathname);

  async function handleLogout() {
    setLogoutError("");
    try {
      await signOut();
      setMenuOpen(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    }
  }

  return (
    <div className="app-root">
      {!isAuthPage && <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark">n</span><span>nomadly<span className="brand-period">.</span></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.slice(1, 5).map(item => <Link key={item.href} href={item.href} className={pathname === item.href ? "nav-link active" : "nav-link"}>{item.label}</Link>)}
        </nav>
        <div className="top-actions">
          {!loading && (user ? <>
            <Link href="/profile" className="profile-link">Your profile</Link>
            <button type="button" className="profile-link" onClick={handleLogout}><LogOut size={14} aria-hidden="true" /> Logout</button>
          </> : <Link href="/login" className="profile-link">Sign in</Link>)}
          <button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>}
      {!isAuthPage && menuOpen && <div className="mobile-menu">
        {nav.map(item => <Link onClick={() => setMenuOpen(false)} key={item.href} href={item.href}><item.icon size={17} />{item.label}</Link>)}
        {!loading && (user
          ? <button type="button" onClick={handleLogout}><LogOut size={17} />Logout</button>
          : <Link onClick={() => setMenuOpen(false)} href="/login">Sign in</Link>)}
      </div>}
      {logoutError && !isAuthPage && <p className="auth-error" role="alert" style={{ padding: "0.5rem 1rem" }}>{logoutError}</p>}
      <main className="main-content">{children}</main>
      {!isAuthPage && <footer className="footer"><div className="footer-brand">nomadly<span className="brand-period">.</span></div><span>Discover. Connect. Experience.</span><span>Built for the curious.</span></footer>}
      {!isAuthPage && <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{nav.slice(0, 5).map(item => <Link key={item.href} href={item.href} className={pathname === item.href ? "mobile-nav-item active" : "mobile-nav-item"}><item.icon size={19} /><span>{item.label}</span></Link>)}</nav>}
    </div>
  );
}
