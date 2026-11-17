import Link from "next/link";
import { ArrowRight, Compass, MapPin, Sparkles, Users, CalendarDays, Camera, Utensils, Mountain, Plane, Train, Bus, BedDouble, Ticket } from "lucide-react";
import { destinations, upcomingFestivals, suggestedTravellers } from "@/lib/demo-data";

export default function HomePage() {
  return (
    <div className="page-stack nomadly-home">
      <section className="hero hero-premium">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> MAKE ROOM FOR THE UNEXPECTED</span>
          <h1>Travel beyond<br />the <em>ordinary.</em></h1>
          <p>Discover remarkable places, meet people who share your curiosity, and turn the places on your wishlist into journeys worth remembering.</p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/explore">Start exploring <ArrowRight size={16} /></Link>
            <Link className="button button-light" href="/connect">Find your people</Link>
          </div>
          <div className="hero-proof"><span className="proof-dot" /> More than a booking site. A world of travel possibilities.</div>
        </div>
        <div className="hero-image">
          <div className="hero-image-label"><MapPin size={15} /> Your next story is out there</div>
        </div>
        <div className="hero-floating-note"><span className="floating-note-icon"><Compass size={17}/></span><span><strong>Find your somewhere</strong><small>Places, people and experiences</small></span></div>
      </section>

      <section className="quick-search-panel">
        <div className="quick-search-heading"><span className="eyebrow">WHERE TO NEXT?</span><strong>Let curiosity lead.</strong></div>
        <Link className="quick-search-input" href="/explore"><MapPin size={18}/><span>Search destinations, experiences and hidden gems</span><span className="quick-search-go"><ArrowRight size={17}/></span></Link>
        <div className="quick-categories">
          <Link href="/explore?type=Mountains"><Mountain/><span>Mountains</span></Link>
          <Link href="/explore?type=Coastal"><Compass/><span>Coastlines</span></Link>
          <Link href="/explore?type=Culture"><Sparkles/><span>Culture</span></Link>
          <Link href="/festivals"><CalendarDays/><span>Festivals</span></Link>
          <Link href="/trips"><MapPin/><span>Weekend escapes</span></Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">PLACES THAT STAY WITH YOU</span><h2>Find a place that feels like yours.</h2><p>From familiar favourites to the places you haven't discovered yet.</p></div>
          <Link className="text-link" href="/explore">Explore all destinations <ArrowRight size={15} /></Link>
        </div>
        <div className="destination-grid">
          {destinations.slice(0, 3).map((place) => (
            <Link href={`/destinations/${place.name.toLowerCase()}`} className="destination-card destination-card-premium" key={place.name}>
              <div className={`destination-photo ${place.theme}`}><span className="photo-overlay-label">{place.type}</span></div>
              <div className="destination-meta"><span>{place.region}</span><span>DISCOVER <ArrowRight size={12}/></span></div>
              <h3>{place.name}</h3><p>{place.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="booking-strip">
        <div><span className="eyebrow">WHEN YOU'RE READY TO GO</span><h2>From “what if?” to “I'm going.”</h2><p>Keep the journey moving with useful ways to explore transport, stays, tickets and experiences.</p></div>
        <div className="booking-shortcuts">
          <span><Plane/>Flights</span><span><Train/>Trains</span><span><Bus/>Buses</span><span><BedDouble/>Stays</span><span><Ticket/>Tickets</span>
        </div>
        <small>Booking options will connect to external providers. Prices and availability are not shown in this starter experience.</small>
      </section>

      <section className="split-section">
        <div className="split-copy">
          <span className="eyebrow">THE BEST STORIES ARE SHARED</span>
          <h2>Your next travel companion might be one connection away.</h2>
          <p>Meet people heading in the same direction, discover shared interests and start planning a journey together.</p>
          <Link className="button button-dark" href="/connect">Meet fellow travellers <ArrowRight size={16} /></Link>
        </div>
        <div className="traveller-stack">
          {suggestedTravellers.map((person, i) => (
            <div className="traveller-row" key={person.name}>
              <div className={`avatar avatar-${i}`}>{person.initials}</div>
              <div className="traveller-info"><strong>{person.name}</strong><span>{person.detail}</span></div>
              <span className="match-pill">{person.match}% interest match</span>
            </div>
          ))}
          <div className="traveller-note"><Users size={17} /> Shared interests are a great place to start.</div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">CULTURE, CALENDAR & CELEBRATION</span><h2>Make the moment part of the journey.</h2><p>Discover festivals and cultural events worth travelling for.</p></div>
          <Link className="text-link" href="/festivals">Explore festivals <ArrowRight size={15} /></Link>
        </div>
        <div className="festival-grid">
          {upcomingFestivals.map((event) => (
            <article className="festival-card" key={event.name}>
              <div className={`festival-photo ${event.theme}`}><span>{event.month}</span></div>
              <div className="festival-card-body"><span className="eyebrow">{event.location}</span><h3>{event.name}</h3><p>{event.description}</p><span className="date-line"><CalendarDays size={14} /> {event.dateLabel}</span></div>
            </article>
          ))}
        </div>
        <p className="disclaimer">Festival dates and details are illustrative sample content. Confirm current schedules with official organisers before making travel plans.</p>
      </section>

      <section className="feature-band">
        <div><span className="eyebrow">ONE TRAVEL ECOSYSTEM</span><h2>Every part of the journey belongs here.</h2></div>
        <div className="feature-list">
          <span><Compass size={17} /> Local discovery</span><span><Sparkles size={17} /> AI trip planning</span><span><Utensils size={17} /> Food & culture</span><span><Mountain size={17} /> Adventures</span><span><Camera size={17} /> Travel journals</span>
        </div>
      </section>
    </div>
  );
}
