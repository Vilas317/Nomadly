import { CalendarDays, MapPin, Shirt } from "lucide-react";
import { upcomingFestivals } from "@/lib/demo-data";

export default function FestivalsPage() {
  return (
    <div className="page-stack">
      <section className="page-intro"><span className="eyebrow">CELEBRATE THE WORLD</span><h1>Find a festival worth travelling for.</h1><p>Explore cultural celebrations, local traditions and events around the world.</p></section>
      <div className="search-bar"><CalendarDays size={18} /><input aria-label="Search festivals" placeholder="Search festivals, countries or cities" /><button className="button button-dark">Explore calendar</button></div>
      <div className="festival-grid festival-grid-large">{upcomingFestivals.map(event => <article className="festival-card" key={event.name}><div className={`festival-photo ${event.theme}`}><span>{event.month}</span></div><div className="festival-card-body"><span className="eyebrow">{event.location}</span><h3>{event.name}</h3><p>{event.description}</p><span className="date-line"><CalendarDays size={14} /> {event.dateLabel}</span><div className="festival-tips"><span><Shirt size={14} /> Dress respectfully and for the weather</span><span><MapPin size={14} /> Check official venue and route information</span></div></div></article>)}</div>
      <div className="notice">Festival information shown here is sample content for the starter UI, not a verified live event calendar. Official dates, timings, tickets and dress guidance must be verified before publication.</div>
    </div>
  );
}
