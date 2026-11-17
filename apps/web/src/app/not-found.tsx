import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return <div className="not-found"><Compass size={30}/><span className="eyebrow">OFF THE MAP</span><h1>We couldn't find that place.</h1><p>Try exploring the destination collection instead.</p><Link className="button button-dark" href="/explore">Explore destinations</Link></div>;
}
