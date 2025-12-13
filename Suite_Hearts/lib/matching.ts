import { User } from '../types';

export type MatchOptions = {
  weights?: {
    budget?: number;
    distance?: number;
    pets?: number;
    smoking?: number;
    nightOwl?: number;
    city?: number;
    interests?: number;
  };
  maxDistanceKm?: number; // hard cutoff (optional)
  topN?: number;
};

export type MatchResult = {
  id: string;
  score: number;
  reasons: string[];
};

/**
 * roommate matching scorer for Suite Hearts.
 * - Uses fields in `types.ts` 
 * - Returns scored candidates sorted descending (highest score first)
 */
export function matchRoommates(
  import { User, Listing } from '../types';

  export type MatchOptions = {
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
    return (v || '').toString().trim().toLowerCase();
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
    const h = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }

  function hasBudgetOverlap(aMin?: number, aMax?: number, bMin?: number, bMax?: number) {
    const Amin = typeof aMin === 'number' ? aMin : NaN;
    const Amax = typeof aMax === 'number' ? aMax : NaN;
    const Bmin = typeof bMin === 'number' ? bMin : NaN;
    const Bmax = typeof bMax === 'number' ? bMax : NaN;
    if (Number.isNaN(Amin) || Number.isNaN(Amax) || Number.isNaN(Bmin) || Number.isNaN(Bmax)) {
      return { overlap: -1, pct: 0 };
    }
    const low = Math.max(Amin, Bmin);
    const high = Math.min(Amax, Bmax);
    const overlap = Math.max(0, high - low);
    const avgRange = (Amax - Amin + Bmax - Bmin) / 2 || 1;
    const pct = overlap / avgRange;
    return { overlap, pct };
  }

  /**
   * roommate matching scorer
   */
  export function matchRoommates(me: User, candidates: User[], options: MatchOptions = {}): MatchResult[] {
    if (!me || !Array.isArray(candidates)) return [];

    const defaultWeights: Record<string, number> = {
      budget: 4,
      distance: 2,
      pets: 3,
      smoking: 3,
      nightOwl: 2,
      city: 1.5,
      interests: 0.5,
    };

    const weights = { ...defaultWeights, ...(options.weights || {}) };

    function scoreCandidate(c: User): MatchResult {
      let score = 0;
      const reasons: string[] = [];

      // Budget
      const bud = hasBudgetOverlap(me.minBudget, me.maxBudget, c.minBudget, c.maxBudget);
      if (bud.overlap > 0) {
        const s = weights.budget * Math.min(1, bud.pct);
        score += s;
        reasons.push(`budget overlap (${Math.round(bud.overlap)})`);
      } else {
        score -= weights.budget * 0.5;
        reasons.push('budget mismatch');
      }

      // Preferred city
      const myCity = normalizeString(me.preferredCity);
      const otherCity = normalizeString(c.preferredCity);
      if (myCity && otherCity && myCity === otherCity) {
        score += weights.city;
        reasons.push(`same preferred city: ${myCity}`);
      }

      // Distance
      if (
        typeof me.preferredLatitude === 'number' &&
        typeof me.preferredLongitude === 'number' &&
        typeof c.preferredLatitude === 'number' &&
        typeof c.preferredLongitude === 'number'
      ) {
        const d = haversineKm(me.preferredLatitude!, me.preferredLongitude!, c.preferredLatitude!, c.preferredLongitude!);
        const maxUseful = 50;
        const distScore = Math.max(0, 1 - d / maxUseful);
        score += weights.distance * distScore;
        reasons.push(`distance ${d.toFixed(1)} km`);
        if (typeof options.maxDistanceKm === 'number' && d > options.maxDistanceKm) {
          score -= 1000;
          reasons.push(`outside max distance ${options.maxDistanceKm}km`);
        }
      }

      // Pets
      const mePets = normalizeString(me.pets);
      const cPets = normalizeString(c.pets);
      if (mePets && cPets) {
        score += weights.pets;
        reasons.push('both have/allow pets');
      } else if ((mePets && !cPets) || (!mePets && cPets)) {
        score -= weights.pets * 0.8;
        reasons.push('pets mismatch');
      }

      // Smoking
      const meSmoke = normalizeString(me.smoking);
      const cSmoke = normalizeString(c.smoking);
      if (meSmoke && cSmoke) {
        if (meSmoke === cSmoke) {
          score += weights.smoking;
          reasons.push(`smoking both: ${meSmoke}`);
        } else {
          score -= weights.smoking * 1.2;
          reasons.push(`smoking mismatch (${meSmoke}/${cSmoke})`);
        }
      }

      // Night owl
      const meNight = normalizeString(me.nightOwl);
      const cNight = normalizeString(c.nightOwl);
      if (meNight && cNight) {
        if (meNight === cNight) {
          score += weights.nightOwl;
          reasons.push(`same sleep schedule: ${meNight}`);
        } else {
          score -= weights.nightOwl * 0.6;
          reasons.push(`sleep schedule mismatch (${meNight}/${cNight})`);
        }
      }

      // Interests / keywords
      const myWords = (me.questions || []).join(' ').toLowerCase() + ' ' + (me.bio || '').toLowerCase();
      const otherWords = (c.questions || []).join(' ').toLowerCase() + ' ' + (c.bio || '').toLowerCase();
      const shared = [...new Set(myWords.split(/\W+/).filter(Boolean))].filter((w) => otherWords.includes(w));
      const sharedCount = Math.min(3, shared.length);
      if (sharedCount > 0) {
        score += weights.interests * sharedCount;
        reasons.push(`shared keywords: ${shared.slice(0, 3).join(', ')}`);
      }

      return { id: c.id, score, reasons };
    }

    const scored = candidates.map(scoreCandidate);
    const filtered = scored.filter((r) => r.score > -100);
    filtered.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return options.topN ? filtered.slice(0, options.topN) : filtered;
  }

  /**
   * match listings to a searcher (User ↔ Listing)
   */
  export function matchListings(me: User, listings: Listing[], options: MatchOptions = {}): MatchResult[] {
    if (!me || !Array.isArray(listings)) return [];

    const defaultWeights: Record<string, number> = {
      price: 5,
      distance: 3,
      city: 1.5,
      spaceType: 1,
      bedrooms: 1,
      leaseDuration: 1,
      recency: 0.5,
      keywords: 0.5,
    };
    const weights = { ...defaultWeights, ...(options.weights || {}) };

    function scoreListing(l: Listing): MatchResult {
      let score = 0;
      const reasons: string[] = [];

      // Price vs user's budget
      const price = typeof l.price === 'number' ? l.price : NaN;
      if (Number.isFinite(me.minBudget) && Number.isFinite(me.maxBudget) && Number.isFinite(price)) {
        if (price >= (me.minBudget || 0) && price <= (me.maxBudget || Infinity)) {
          score += weights.price;
          reasons.push(`price within budget: $${price}`);
        } else {
          // penalize based on distance from range
          const min = me.minBudget || 0;
          const max = me.maxBudget || Infinity;
          const dist = price < min ? min - price : price - max;
          const penalty = Math.min(1, dist / Math.max(1, (max - min || min || 1)));
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
      if (typeof me.preferredLatitude === 'number' && typeof me.preferredLongitude === 'number' && typeof l.latitude === 'number' && typeof l.longitude === 'number') {
        const d = haversineKm(me.preferredLatitude!, me.preferredLongitude!, l.latitude, l.longitude);
        const maxUseful = 50;
        const distScore = Math.max(0, 1 - d / maxUseful);
        score += weights.distance * distScore;
        reasons.push(`distance ${d.toFixed(1)} km`);
        if (typeof options.maxDistanceKm === 'number' && d > options.maxDistanceKm) {
          score -= 1000;
          reasons.push(`outside max distance ${options.maxDistanceKm}km`);
        }
      }

      // Space type (user preference vs listing title/description)
      if (me.spaceType) {
        const needle = normalizeString(me.spaceType);
        const hay = normalizeString((l.title || '') + ' ' + (l.description || ''));
        if (needle && hay.includes(needle)) {
          score += weights.spaceType;
          reasons.push(`spaceType match: ${me.spaceType}`);
        }
      }

      // Bedrooms vs maxRoommates (simple heuristic)
      if (typeof l.bedrooms === 'number' && typeof me.maxRoommates === 'number') {
        if (l.bedrooms >= Math.max(1, me.maxRoommates)) {
          score += weights.bedrooms;
          reasons.push(`bedrooms ${l.bedrooms} >= maxRoommates ${me.maxRoommates}`);
        } else {
          score -= weights.bedrooms * 0.5;
          reasons.push(`not enough bedrooms: ${l.bedrooms}`);
        }
      }

      // Recency (newer listings slightly preferred)
      if (typeof l.createdAt === 'number') {
        const ageDays = (Date.now() - l.createdAt) / (1000 * 60 * 60 * 24);
        const recentScore = Math.max(0, 1 - ageDays / 30);
        score += weights.recency * recentScore;
        reasons.push(`recency ${ageDays.toFixed(1)}d`);
      }

      // Keyword overlap between listing and user
      const mine = (me.questions || []).join(' ').toLowerCase() + ' ' + (me.bio || '').toLowerCase();
      const theirs = ((l.title || '') + ' ' + (l.description || '')).toLowerCase();
      const mineWords = [...new Set(mine.split(/\W+/).filter(Boolean))];
      const shared = mineWords.filter((w) => theirs.includes(w));
      if (shared.length > 0) {
        const bonus = Math.min(3, shared.length) / 3;
        score += weights.keywords * bonus;
        reasons.push(`shared keywords: ${shared.slice(0, 3).join(', ')}`);
      }

      return { id: l.id, score, reasons };
    }

    const scored = listings.map(scoreListing);
    const filtered = scored.filter((r) => r.score > -100);
    filtered.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return options.topN ? filtered.slice(0, options.topN) : filtered;
  }

  export default matchRoommates;
