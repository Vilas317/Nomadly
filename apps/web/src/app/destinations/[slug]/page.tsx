import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin, Compass, CalendarDays, Plane, Train, Bus, BedDouble, Ticket, Sparkles } from "lucide-react";
import { destinations } from "@/lib/demo-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return destinations.map((place) => ({ slug: place.name.toLowerCase() }));
}

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const place = destinations.find((item) => item.name.toLowerCase() === slug);
  if (!place) notFound();

  return (
    <div className="page-stack destination-detail-page">
      <Link href="/explore" className="back-link"><ArrowLeft size={15}/> Back to explore</Link>
      <section className={`destination-detail-hero ${place.theme}`}>
        <div className="destination-detail-shade"/>
        <div className="destination-detail-copy">
          <span className="eyebrow">DESTINATION GUIDE · {place.type.toUpperCase()}</span>
          <h1>{place.name}</h1>
          <p><MapPin size={16}/> {place.region}</p>
          <span className="detail-country">{place.country}</span>
        </div>
      </section>
      <div className="detail-content-grid">
        <main className="detail-main">
          <span className="eyebrow">A PLACE TO DISCOVER</span>
          <h2>Find your own way into {place.name}.</h2>
          <p className="detail-description">{place.description} Explore at your own pace, discover the character of the region and build a journey around the things that matter to you.</p>
          <div className="detail-highlights">
            <div><Compass/><strong>Explore</strong><span>Discover places and experiences</span></div>
            <div><CalendarDays/><strong>Plan</strong><span>Add this destination to a future trip</span></div>
            <div><Sparkles/><strong>Experience</strong><span>Find your own travel rhythm</span></div>
          </div>
          <section className="booking-options">
            <div><span className="eyebrow">KEEP THE JOURNEY MOVING</span><h2>Plan how you'll get there.</h2><p>These are booking categories to consider, not live offers. Provider links and live prices will be added after integrations are verified.</p></div>
            <div className="booking-option-list">
              <div><Plane/><span><strong>Flights</strong><small>Compare routes to the nearest airport</small></span><span className="coming-soon">Coming soon</span></div>
              <div><Train/><span><strong>Trains</strong><small>Explore rail connections</small></span><span className="coming-soon">Coming soon</span></div>
              <div><Bus/><span><strong>Buses & local transfers</strong><small>Plan the final leg of your journey</small></span><span className="coming-soon">Coming soon</span></div>
              <div><BedDouble/><span><strong>Stays</strong><small>Find accommodation for your trip</small></span><span className="coming-soon">Coming soon</span></div>
              <div><Ticket/><span><strong>Activities & tickets</strong><small>Discover things to do at your destination</small></span><span className="coming-soon">Coming soon</span></div>
            </div>
          </section>
        </main>
        <aside className="detail-aside">
          <span className="eyebrow">MAKE IT YOUR JOURNEY</span>
          <h3>Want to explore {place.name}?</h3>
          <p>Start shaping a trip around this destination.</p>
          <Link href="/trips" className="button button-dark">Plan a trip <ArrowRight size={15}/></Link>
          <div className="aside-note"><MapPin size={15}/> Destination details are currently starter content and will be enriched with verified local information.</div>
        </aside>
      </div>
    </div>
  );
}
