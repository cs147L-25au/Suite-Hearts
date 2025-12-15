import { User, Listing } from "../types";

export type ListingMatchOptions = {
  weights?: Record<string, number>;
  maxDistanceKm?: number;
  topN?: number;
};

export type MatchResult = {
  id: string;
  score: number;
  reasons: string[];
};

function normalizeString(v?: string) {
  return (v || "").toString().trim().toLowerCase();
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * Match listings to a searcher (User ↔ Listing)
 * - Pure function, returns scored listings sorted descending
 */
export function matchListings(
  me: User,
  listings: Listing[],
  options: ListingMatchOptions = {}
): MatchResult[] {
  if (!me || !Array.isArray(listings)) return [];

  const defaultWeights: Record<string, number> = {
    price: 5,
    distance: 3,
    city: 1.5,
    spaceType: 1,
    bedrooms: 1,
    recency: 0.5,
    keywords: 0.5,
  };
  const weights = { ...defaultWeights, ...(options.weights || {}) };

  function scoreListing(l: Listing): MatchResult {
    let score = 0;
    const reasons: string[] = [];

    // Price vs user's budget
    const price = typeof l.price === "number" ? l.price : NaN;
    if (
      Number.isFinite(me.minBudget) &&
      Number.isFinite(me.maxBudget) &&
      Number.isFinite(price)
    ) {
      if (price >= (me.minBudget || 0) && price <= (me.maxBudget || Infinity)) {
        score += weights.price;
        reasons.push(`price within budget: $${price}`);
      } else {
        const min = me.minBudget || 0;
        const max = me.maxBudget || Infinity;
        const dist = price < min ? min - price : price - max;
        const penalty = Math.min(1, dist / Math.max(1, max - min || min || 1));
        score -= weights.price * penalty;
        reasons.push(`price mismatch: $${price}`);
      }
    }

    // City match
    const myCity = normalizeString(me.preferredCity);
    const listingCity = normalizeString(l.city);
    if (myCity && listingCity && myCity === listingCity) {
      score += weights.city;
      reasons.push(`city match: ${myCity}`);
    }

    // Distance
    if (
      typeof me.preferredLatitude === "number" &&
      typeof me.preferredLongitude === "number" &&
      typeof l.latitude === "number" &&
      typeof l.longitude === "number"
    ) {
      const d = haversineKm(
        me.preferredLatitude!,
        me.preferredLongitude!,
        l.latitude,
        l.longitude
      );
      const maxUseful = 50;
      const distScore = Math.max(0, 1 - d / maxUseful);
      score += weights.distance * distScore;
      reasons.push(`distance ${d.toFixed(1)} km`);
      if (
        typeof options.maxDistanceKm === "number" &&
        d > options.maxDistanceKm
      ) {
        score -= 1000;
        reasons.push(`outside max distance ${options.maxDistanceKm}km`);
      }
    }

    // Space type (user preference vs listing title/description)
    if (me.spaceType) {
      const needle = normalizeString(me.spaceType);
      const hay = normalizeString(
        (l.title || "") + " " + (l.description || "")
      );
      if (needle && hay.includes(needle)) {
        score += weights.spaceType;
        reasons.push(`spaceType match: ${me.spaceType}`);
      }
    }

    // Bedrooms vs maxRoommates (simple heuristic)
    if (typeof l.bedrooms === "number" && typeof me.maxRoommates === "number") {
      if (l.bedrooms >= Math.max(1, me.maxRoommates)) {
        score += weights.bedrooms;
        reasons.push(
          `bedrooms ${l.bedrooms} >= maxRoommates ${me.maxRoommates}`
        );
      } else {
        score -= weights.bedrooms * 0.5;
        reasons.push(`not enough bedrooms: ${l.bedrooms}`);
      }
    }

    // Recency (newer listings slightly preferred)
    if (typeof l.createdAt === "number") {
      const ageDays = (Date.now() - l.createdAt) / (1000 * 60 * 60 * 24);
      const recentScore = Math.max(0, 1 - ageDays / 30);
      score += weights.recency * recentScore;
      reasons.push(`recency ${ageDays.toFixed(1)}d`);
    }

    // Keyword overlap between listing and user
    const mine =
      (me.questions || []).join(" ").toLowerCase() +
      " " +
      (me.bio || "").toLowerCase();
    const theirs = (
      (l.title || "") +
      " " +
      (l.description || "")
    ).toLowerCase();
    const mineWords = [...new Set(mine.split(/\W+/).filter(Boolean))];
    const shared = mineWords.filter((w) => theirs.includes(w));
    if (shared.length > 0) {
      const bonus = Math.min(3, shared.length) / 3;
      score += weights.keywords * bonus;
      reasons.push(`shared keywords: ${shared.slice(0, 3).join(", ")}`);
    }

    return { id: l.id, score, reasons };
  }

  const scored = listings.map(scoreListing);
  const filtered = scored.filter((r) => r.score > -100);
  filtered.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return options.topN ? filtered.slice(0, options.topN) : filtered;
}

export default matchListings;
