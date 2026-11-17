import { CalendarDays, MapPin, Plus, Sparkles } from "lucide-react";

export default function TripsPage() {
  return (
    <div className="page-stack">
      <section className="page-intro"><span className="eyebrow">MAKE IT A JOURNEY</span><h1>Your trips, your way.</h1><p>Bring destinations, people and plans together in one shared space.</p></section>
      <div className="trip-empty">
        <div className="empty-icon"><MapPin size={28} /></div><span className="eyebrow">YOUR NEXT ADVENTURE</span><h2>Your travel story starts here.</h2><p>Create a trip, add places you want to visit and invite people to plan with you.</p><button className="button button-dark"><Plus size={16} /> Create a trip</button>
      </div>
      <div className="section-heading compact"><div><h2>Planning tools</h2><p>Everything you need to shape a memorable trip.</p></div></div>
      <div className="tool-grid"><div className="tool-card"><CalendarDays /><h3>Day-by-day itinerary</h3><p>Organize places and activities into a simple travel schedule.</p></div><div className="tool-card"><Sparkles /><h3>AI trip ideas</h3><p>Turn your interests, time and budget into a starting itinerary.</p></div><div className="tool-card"><MapPin /><h3>Saved destinations</h3><p>Keep interesting places together while you plan.</p></div></div>
      <div className="notice">Trip creation and collaboration are interface placeholders in this starter release. Backend trip workflows are part of the next implementation milestone.</div>
    </div>
  );
}
