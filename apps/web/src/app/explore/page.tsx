"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, MapPin, ArrowUpRight, SlidersHorizontal, X } from "lucide-react";
import { destinations } from "@/lib/demo-data";

const categories = ["All places", "Mountains", "Coastal", "Heritage", "Adventure", "Culture", "Nature"];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All places");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => destinations.filter((place) => {
    const matchesCategory = category === "All places" || place.type === category;
    const haystack = `${place.name} ${place.region} ${place.country} ${place.type} ${place.description}`.toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  }), [query, category]);

  return (
    <div className="page-stack explore-page">
      <section className="explore-heading">
        <div className="page-intro"><span className="eyebrow">THE WORLD, A LITTLE CLOSER</span><h1>Somewhere new<br/><em>is waiting.</em></h1><p>Find places that match your pace, your curiosity and the way you love to travel.</p></div>
        <div className="explore-heading-aside"><span>CURATED FOR THE CURIOUS</span><strong>6</strong><small>destinations to begin with</small></div>
      </section>

      <section className="explore-controls" aria-label="Destination search and filters">
        <div className="explore-search"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, regions or experiences" aria-label="Search destinations"/>{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={16}/></button>}</div>
        <button className={`button button-outline filter-toggle ${showFilters ? "selected" : ""}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15}/> Filters</button>
      </section>

      <div className="category-scroller" aria-label="Destination categories">
        {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`category-pill ${category === item ? "active" : ""}`}>{item}</button>)}
      </div>
      {showFilters && <div className="filter-explainer"><strong>Explore by travel mood</strong><span>Choose a category above to narrow the destinations. More detailed filters will arrive in a later milestone.</span></div>}

      <div className="results-heading"><span>{filtered.length} {filtered.length === 1 ? "place" : "places"} to explore</span><span>INDIA · STARTER COLLECTION</span></div>
      {filtered.length ? <div className="destination-grid destination-grid-wide explore-results">
        {filtered.map((place, index) => (
          <Link href={`/destinations/${place.name.toLowerCase()}`} className="destination-card destination-card-premium" key={place.name}>
            <div className={`destination-photo ${place.theme}`}><span className="photo-overlay-label">{place.type}</span><span className="photo-index">0{index + 1}</span></div>
            <div className="destination-meta"><span>{place.region}</span><span><ArrowUpRight size={14}/></span></div>
            <h3>{place.name}</h3><p>{place.description}</p>
            <div className="card-footer"><span><MapPin size={14}/> {place.country}</span><span className="discover-link">Discover place <ArrowUpRight size={13}/></span></div>
          </Link>
        ))}
      </div> : <div className="empty-results"><Search size={25}/><h2>No places found</h2><p>Try another search or choose a different category.</p><button className="button button-dark" onClick={() => {setQuery("");setCategory("All places");}}>Clear filters</button></div>}
      <p className="disclaimer">Destination cards use sample descriptions and illustrative photography. Detailed local information will be expanded and verified as destination content is built.</p>
    </div>
  );
}
