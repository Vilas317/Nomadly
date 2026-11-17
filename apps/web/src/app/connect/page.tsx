import { Heart, MapPin, SlidersHorizontal, Users } from "lucide-react";
import { suggestedTravellers } from "@/lib/demo-data";

export default function ConnectPage() {
  return (
    <div className="page-stack">
      <section className="page-intro"><span className="eyebrow">GOOD JOURNEYS START WITH PEOPLE</span><h1>Find your kind of traveller.</h1><p>Discover people with shared destinations, interests and travel styles.</p></section>
      <div className="filter-panel"><div><label>Destination</label><strong>Manali, Himachal Pradesh</strong></div><div><label>Travel window</label><strong>Flexible dates</strong></div><div><label>Travel style</label><strong>Any style</strong></div><button className="button button-dark"><SlidersHorizontal size={15} /> Find people</button></div>
      <div className="section-heading compact"><div><h2>People you might connect with</h2><p>Demo profiles for interface preview.</p></div></div>
      <div className="people-grid">{suggestedTravellers.map((person, i) => <article className="person-card" key={person.name}><div className={`person-cover cover-${i}`} /><div className={`person-avatar avatar-${i}`}>{person.initials}</div><div className="person-content"><h3>{person.name}</h3><span className="muted">{person.detail}</span><p>{person.bio}</p><div className="person-tags">{person.tags.map(tag => <span className="chip" key={tag}>{tag}</span>)}</div><div className="person-bottom"><span className="match-pill">{person.match}% interest match</span><button className="button button-outline"><Heart size={15} /> Connect</button></div></div></article>)}</div>
      <div className="notice"><Users size={18} /><span>These are sample profiles. Real traveller discovery, matching and messaging will be connected to user accounts in upcoming development milestones.</span></div>
    </div>
  );
}
