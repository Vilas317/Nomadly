export type TravelStyle = "BACKPACKING" | "LUXURY" | "ADVENTURE" | "CULTURAL" | "SLOW_TRAVEL" | "FAMILY" | "OTHER";

export interface DestinationSummary {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  state?: string | null;
  country: string;
  category: string;
  coverImage?: string | null;
}

export interface TravellerSearchFilters {
  destinationSlug?: string;
  startDate?: string;
  endDate?: string;
  interests?: string[];
  travelStyle?: TravelStyle;
  budgetMin?: number;
  budgetMax?: number;
}

export interface FestivalSummary {
  id: string;
  name: string;
  country: string;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  dateType: "FIXED" | "VARIABLE" | "TENTATIVE";
  lastVerifiedAt?: string | null;
}
