/**
 * Roommate + Housing Recommendation Algorithm
 * 
 * A transparent, rule-based compatibility scoring system for matching
 * users with potential roommates and housing listings.
 * 
 * PRIORITY ORDER:
 * 1. CITY (HARD FILTER - must match)
 * 2. CORE HOUSING CONSTRAINTS (50% weight)
 * 3. DEMOGRAPHIC PREFERENCES (20% weight)
 * 4. LIFESTYLE PREFERENCES (30% weight)
 */

import { User, Listing } from '../types';

export interface RecommendationCandidate {
  candidate: User | Listing;
  score: number;
  type: 'user' | 'listing';
}

export interface CompatibilityScore {
  total: number;
  housingCore: number;
  demographics: number;
  lifestyle: number;
  breakdown?: {
    budgetOverlap: number;
    housingType: number;
    roommateType: number;
    roommateCount: number;
    age: number;
    race: number;
    cleanliness: number;
    sleepSchedule: number;
    guests: number;
    smoking: number;
    pets: number;
    friendliness: number;
  };
}

/**
 * Compute compatibility score between two users
 * Returns score between 0 and 1, or null if city mismatch (hard filter)
 */
/**
 * Normalize city name for comparison (handles variations like "SF" vs "San Francisco")
 */
function normalizeCityName(city: string): string {
  const normalized = city.trim().toLowerCase();
  // Handle common variations
  if (normalized === 'sf' || normalized === 'san francisco') {
    return 'san francisco';
  }
  return normalized;
}

export function computeCompatibilityScore(userA: User, userB: User): CompatibilityScore | null {
  // HARD FILTER: City must match (handle variations like "SF" vs "San Francisco")
  const cityA = userA.preferredCity || userA.location;
  const cityB = userB.preferredCity || userB.location;
  
  if (cityA && cityB) {
    const cityANorm = normalizeCityName(cityA);
    const cityBNorm = normalizeCityName(cityB);
    
    if (cityANorm !== cityBNorm) {
      return null; // Exclude cross-city matches
    }
  }

  // Weights for different categories
  const weights = {
    housingCore: 0.50,
    demographics: 0.20,
    lifestyle: 0.30,
  };

  // Calculate sub-scores
  const housingCoreScore = computeHousingCoreScore(userA, userB);
  const demographicsScore = computeDemographicsScore(userA, userB);
  const lifestyleScore = computeLifestyleScore(userA, userB);

  // Weighted total score
  const totalScore =
    housingCoreScore * weights.housingCore +
    demographicsScore * weights.demographics +
    lifestyleScore * weights.lifestyle;

  return {
    total: Math.min(1, Math.max(0, totalScore)), // Clamp between 0 and 1
    housingCore: housingCoreScore,
    demographics: demographicsScore,
    lifestyle: lifestyleScore,
  };
}

/**
 * Compute housing core compatibility (50% of total score)
 * Includes: budget overlap, housing type, roommate type, roommate count
 */
function computeHousingCoreScore(userA: User, userB: User): number {
  let score = 0;
  let components = 0;

  // Budget overlap (normalized to 0-1)
  const budgetScore = computeBudgetOverlap(userA, userB);
  score += budgetScore;
  components += 1;

  // Housing type match
  const housingTypeScore = computeHousingTypeMatch(userA, userB);
  score += housingTypeScore;
  components += 1;

  // Roommate type match (roommates vs suitemates)
  const roommateTypeScore = computeRoommateTypeMatch(userA, userB);
  score += roommateTypeScore;
  components += 1;

  // Roommate count compatibility
  const roommateCountScore = computeRoommateCountCompatibility(userA, userB);
  score += roommateCountScore;
  components += 1;

  // Average of components
  return components > 0 ? score / components : 0;
}

/**
 * Compute budget overlap score
 * Full overlap = 1, partial overlap = proportional, no overlap = 0
 */
function computeBudgetOverlap(userA: User, userB: User): number {
  const minA = userA.minBudget || 0;
  const maxA = userA.maxBudget || 0;
  const minB = userB.minBudget || 0;
  const maxB = userB.maxBudget || 0;

  if (minA === 0 || maxA === 0 || minB === 0 || maxB === 0) {
    return 0.5; // Neutral score if budget not specified
  }

  // Calculate overlap range
  const overlapMin = Math.max(minA, minB);
  const overlapMax = Math.min(maxA, maxB);

  if (overlapMax < overlapMin) {
    return 0; // No overlap
  }

  const overlapRange = overlapMax - overlapMin;
  const rangeA = maxA - minA;
  const rangeB = maxB - minB;
  const unionRange = Math.max(maxA, maxB) - Math.min(minA, minB);

  // Score based on overlap percentage
  if (unionRange === 0) return 1;
  return overlapRange / unionRange;
}

/**
 * Compute housing type compatibility
 * Returns 1 if compatible, 0 if not
 */
function computeHousingTypeMatch(userA: User, userB: User): number {
  const spaceTypeA = Array.isArray(userA.spaceType) ? userA.spaceType : (userA.spaceType ? [userA.spaceType] : []);
  const spaceTypeB = Array.isArray(userB.spaceType) ? userB.spaceType : (userB.spaceType ? [userB.spaceType] : []);

  if (spaceTypeA.length === 0 || spaceTypeB.length === 0) {
    return 0.5; // Neutral if not specified
  }

  // Check if there's any overlap
  const hasOverlap = spaceTypeA.some(type => spaceTypeB.includes(type));
  return hasOverlap ? 1 : 0;
}

/**
 * Compute roommate type match (roommates vs suitemates)
 * Returns 1 if compatible, 0 if not
 */
function computeRoommateTypeMatch(userA: User, userB: User): number {
  const typeA = userA.roommateType;
  const typeB = userB.roommateType;

  if (!typeA || !typeB) {
    return 0.5; // Neutral if not specified
  }

  // Both want same type
  if (typeA === typeB) {
    return 1;
  }

  // One wants "both" - compatible with either
  if (typeA === 'both' || typeB === 'both') {
    return 1;
  }

  // Mismatch
  return 0;
}

/**
 * Compute roommate count compatibility
 * Returns score based on how close their preferences are
 */
function computeRoommateCountCompatibility(userA: User, userB: User): number {
  const countA = normalizeRoommateCount(userA.maxRoommates);
  const countB = normalizeRoommateCount(userB.maxRoommates);

  if (countA === null || countB === null) {
    return 0.5; // Neutral if not specified
  }

  // Calculate difference
  const diff = Math.abs(countA - countB);

  // Score decreases with difference
  // Same count = 1, difference of 1 = 0.8, difference of 2 = 0.6, etc.
  return Math.max(0, 1 - diff * 0.2);
}

/**
 * Normalize roommate count to a number
 * "None" = 0, "6+" = 6, numbers stay as-is
 */
function normalizeRoommateCount(count: number | string | undefined): number | null {
  if (count === undefined || count === null) {
    return null;
  }

  if (typeof count === 'string') {
    if (count === 'None' || count.toLowerCase() === 'none') {
      return 0;
    }
    if (count === '6+' || count === '6') {
      return 6;
    }
    const parsed = parseInt(count);
    return isNaN(parsed) ? null : parsed;
  }

  return count;
}

/**
 * Compute demographics compatibility (20% of total score)
 * Includes: age proximity, race preference (soft)
 */
function computeDemographicsScore(userA: User, userB: User): number {
  let score = 0;
  let components = 0;

  // Age proximity
  const ageScore = computeAgeScore(userA, userB);
  score += ageScore;
  components += 1;

  // Race preference (soft - small boost if match, no penalty if not)
  const raceScore = computeRaceScore(userA, userB);
  score += raceScore;
  components += 1;

  return components > 0 ? score / components : 0;
}

/**
 * Compute age compatibility score
 * Within 2-3 years = 1, decreases linearly as gap increases
 */
function computeAgeScore(userA: User, userB: User): number {
  const ageA = parseInt(userA.age || '0');
  const ageB = parseInt(userB.age || '0');

  if (isNaN(ageA) || isNaN(ageB) || ageA === 0 || ageB === 0) {
    return 0.5; // Neutral if age not specified
  }

  const ageDiff = Math.abs(ageA - ageB);

  // Within 2-3 years = 1
  if (ageDiff <= 3) {
    return 1;
  }

  // Decreases linearly: 4 years = 0.8, 5 years = 0.6, etc.
  // Cap at 0 for differences > 10 years
  return Math.max(0, 1 - (ageDiff - 3) * 0.1);
}

/**
 * Compute race preference score (soft preference)
 * Small boost if match, no penalty if not
 */
function computeRaceScore(userA: User, userB: User): number {
  const raceA = userA.race;
  const raceB = userB.race;

  if (!raceA || !raceB) {
    return 0.5; // Neutral if not specified
  }

  // Small boost if match
  if (raceA === raceB) {
    return 0.7; // Slight boost (not full 1.0 to keep it soft)
  }

  // No penalty for mismatch
  return 0.5;
}

/**
 * Compute lifestyle compatibility (30% of total score)
 * Includes: cleanliness, sleep schedule, guests, smoking, pets, friendliness
 */
function computeLifestyleScore(userA: User, userB: User): number {
  let score = 0;
  let components = 0;

  // Cleanliness similarity (distance-based on 1-10 scale)
  const cleanlinessScore = computeCleanlinessScore(userA, userB);
  score += cleanlinessScore;
  components += 1;

  // Sleep schedule match
  const sleepScore = computeSleepScheduleScore(userA, userB);
  score += sleepScore;
  components += 1;

  // Guests compatibility
  const guestsScore = computeGuestsScore(userA, userB);
  score += guestsScore;
  components += 1;

  // Smoking compatibility (hard mismatch reduces score)
  const smokingScore = computeSmokingScore(userA, userB);
  score += smokingScore;
  components += 1;

  // Pets compatibility
  const petsScore = computePetsScore(userA, userB);
  score += petsScore;
  components += 1;

  // Friendliness similarity (distance-based on 1-10 scale)
  const friendlinessScore = computeFriendlinessScore(userA, userB);
  score += friendlinessScore;
  components += 1;

  return components > 0 ? score / components : 0;
}

/**
 * Compute cleanliness compatibility
 * Based on distance between 1-10 scale values
 */
function computeCleanlinessScore(userA: User, userB: User): number {
  const cleanA = (userA as any).cleanliness;
  const cleanB = (userB as any).cleanliness;

  if (cleanA === undefined || cleanB === undefined || cleanA === null || cleanB === null) {
    return 0.5; // Neutral if not specified
  }

  const numA = typeof cleanA === 'string' ? parseInt(cleanA) : cleanA;
  const numB = typeof cleanB === 'string' ? parseInt(cleanB) : cleanB;

  if (isNaN(numA) || isNaN(numB)) {
    return 0.5;
  }

  // Distance on 1-10 scale, normalized to 0-1
  const distance = Math.abs(numA - numB);
  return Math.max(0, 1 - distance / 9); // Max distance is 9 (1 to 10)
}

/**
 * Compute friendliness compatibility
 * Based on distance between 1-10 scale values
 */
function computeFriendlinessScore(userA: User, userB: User): number {
  const friendlyA = (userA as any).friendliness;
  const friendlyB = (userB as any).friendliness;

  if (friendlyA === undefined || friendlyB === undefined || friendlyA === null || friendlyB === null) {
    return 0.5; // Neutral if not specified
  }

  const numA = typeof friendlyA === 'string' ? parseInt(friendlyA) : friendlyA;
  const numB = typeof friendlyB === 'string' ? parseInt(friendlyB) : friendlyB;

  if (isNaN(numA) || isNaN(numB)) {
    return 0.5;
  }

  // Distance on 1-10 scale, normalized to 0-1
  const distance = Math.abs(numA - numB);
  return Math.max(0, 1 - distance / 9); // Max distance is 9 (1 to 10)
}

/**
 * Compute sleep schedule compatibility
 * Returns 1 if match, 0 if mismatch
 */
function computeSleepScheduleScore(userA: User, userB: User): number {
  const scheduleA = userA.nightOwl;
  const scheduleB = userB.nightOwl;

  if (!scheduleA || !scheduleB) {
    return 0.5; // Neutral if not specified
  }

  // Both have same schedule
  if (scheduleA === scheduleB) {
    return 1;
  }

  // "Both" is compatible with either
  if (scheduleA === 'Both' || scheduleB === 'Both') {
    return 1;
  }

  // Mismatch
  return 0;
}

/**
 * Compute guests compatibility
 * "never" + "always" = mismatch, others are compatible
 */
function computeGuestsScore(userA: User, userB: User): number {
  const guestsA = (userA as any).guestsAllowed;
  const guestsB = (userB as any).guestsAllowed;

  if (!guestsA || !guestsB) {
    return 0.5; // Neutral if not specified
  }

  // Hard mismatch: one says "never", other says "always"
  if (
    (guestsA === 'never' && guestsB === 'always okay') ||
    (guestsA === 'always okay' && guestsB === 'never')
  ) {
    return 0.2; // Significant penalty but not zero
  }

  // All other combinations are compatible
  return 1;
}

/**
 * Compute smoking compatibility
 * Hard mismatch reduces score significantly
 */
function computeSmokingScore(userA: User, userB: User): number {
  const smokingA = userA.smoking;
  const smokingB = userB.smoking;

  if (!smokingA || !smokingB) {
    return 0.5; // Neutral if not specified
  }

  // Both have same preference
  if (smokingA === smokingB) {
    return 1;
  }

  // Hard mismatch: one "Never", other "Often"
  if (
    (smokingA === 'Never' && smokingB === 'Often') ||
    (smokingA === 'Often' && smokingB === 'Never')
  ) {
    return 0.1; // Significant penalty
  }

  // Partial mismatch: reduce score
  return 0.5;
}

/**
 * Compute pets compatibility
 * Returns 1 if compatible, 0 if not
 */
function computePetsScore(userA: User, userB: User): number {
  const petsA = userA.pets;
  const petsB = userB.pets;

  if (!petsA || !petsB) {
    return 0.5; // Neutral if not specified
  }

  // Both have same preference
  if (petsA === petsB) {
    return 1;
  }

  // One wants pets, other doesn't - mismatch
  if (
    (petsA === 'Yes' && petsB === 'No') ||
    (petsA === 'No' && petsB === 'Yes')
  ) {
    return 0;
  }

  return 0.5;
}

/**
 * Get recommended roommates for a user
 * Returns sorted list of candidates with scores
 */
export function getRecommendedRoommates(
  currentUser: User,
  candidates: User[],
  threshold: number = 0.3
): RecommendationCandidate[] {
  const scored: RecommendationCandidate[] = [];

  for (const candidate of candidates) {
    // Skip self
    if (candidate.id === currentUser.id) {
      continue;
    }

    // Skip if not looking for roommates
    if (candidate.userType !== 'searcher') {
      continue;
    }

    if (candidate.lookingFor !== 'roommates' && candidate.lookingFor !== 'both') {
      continue;
    }

    // Compute compatibility score
    const scoreResult = computeCompatibilityScore(currentUser, candidate);

    // Skip if city mismatch (hard filter)
    if (scoreResult === null) {
      continue;
    }

    // Skip if below threshold
    if (scoreResult.total < threshold) {
      continue;
    }

    scored.push({
      candidate,
      score: scoreResult.total,
      type: 'user',
    });
  }

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Get recommended listings for a user
 * Returns sorted list of listings with scores
 */
export function getRecommendedListings(
  currentUser: User,
  listings: Listing[],
  threshold: number = 0.3
): RecommendationCandidate[] {
  const scored: RecommendationCandidate[] = [];

  for (const listing of listings) {
    // SOFT FILTER: City preference (show listings from preferred city first, but also show nearby cities)
    const userCity = currentUser.preferredCity || currentUser.location;
    let cityMatch = true;
    let cityBonus = 0;
    
    if (userCity && listing.city) {
      const userCityNorm = normalizeCityName(userCity);
      const listingCityNorm = normalizeCityName(listing.city);
      
      if (userCityNorm !== listingCityNorm) {
        // Check if it's a nearby city (Bay Area cities are close)
        const bayAreaCities = ['san francisco', 'sf', 'berkeley', 'palo alto', 'san jose'];
        const isUserBayArea = bayAreaCities.includes(userCityNorm);
        const isListingBayArea = bayAreaCities.includes(listingCityNorm);
        
        if (isUserBayArea && isListingBayArea) {
          // Both are Bay Area cities - allow but with lower score
          cityMatch = true;
          cityBonus = -0.2; // Small penalty for different city
        } else {
          // Different regions - skip
          continue;
        }
      } else {
        // Exact city match - bonus
        cityBonus = 0.1;
      }
    }

    // Compute listing compatibility score
    let score = computeListingScore(currentUser, listing);
    
    // Apply city bonus/penalty
    score = Math.max(0, Math.min(1, score + cityBonus));
    
    // For Bay Area cross-city listings, ensure minimum score so they show up
    if (cityBonus === -0.2 && score < 0.3) {
      score = 0.3; // Minimum score for Bay Area listings
    }

    // Skip if below threshold
    if (score < threshold) {
      continue;
    }

    scored.push({
      candidate: listing,
      score,
      type: 'listing',
    });
  }

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * City center coordinates (latitude, longitude)
 */
const CITY_CENTERS: Record<string, { lat: number; lon: number }> = {
  'San Francisco': { lat: 37.7749, lon: -122.4194 },
  'SF': { lat: 37.7749, lon: -122.4194 },
  'Berkeley': { lat: 37.8715, lon: -122.2730 },
  'Palo Alto': { lat: 37.4419, lon: -122.1430 },
  'San Jose': { lat: 37.3382, lon: -121.8863 },
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Compute compatibility score for a listing
 * PRIORITY ORDER:
 * 1. Distance from city center (MOST IMPORTANT - 60% weight)
 * 2. Price proximity to min price (SECOND MOST IMPORTANT - 40% weight)
 */
function computeListingScore(user: User, listing: Listing): number {
  // Distance from city center (60% weight) - MOST IMPORTANT
  const distanceScore = computeDistanceScore(user, listing);
  
  // Price proximity to min price (40% weight) - SECOND MOST IMPORTANT
  const priceScore = computePriceProximityScore(user, listing);

  // Weighted total
  const totalScore = distanceScore * 0.6 + priceScore * 0.4;
  
  return Math.min(1, Math.max(0, totalScore));
}

/**
 * Compute distance score from city center (MOST IMPORTANT)
 * Closer to city center = higher score
 * Returns score 0-1, where 1 = at city center, 0 = very far away
 */
function computeDistanceScore(user: User, listing: Listing): number {
  const userCity = user.preferredCity || user.location;
  if (!userCity || !listing.latitude || !listing.longitude) {
    return 0.5; // Neutral if city or coordinates not available
  }

  // Normalize city name and get city center coordinates
  const normalizedCity = normalizeCityName(userCity);
  // Map normalized name back to key
  let cityKey = userCity;
  if (normalizedCity === 'san francisco') {
    cityKey = 'San Francisco';
  } else if (normalizedCity === 'berkeley') {
    cityKey = 'Berkeley';
  } else if (normalizedCity === 'palo alto') {
    cityKey = 'Palo Alto';
  } else if (normalizedCity === 'san jose') {
    cityKey = 'San Jose';
  }
  
  // Also check for "SF" key
  let cityCenter = CITY_CENTERS[cityKey] || CITY_CENTERS[userCity];
  
  // If listing is in a different Bay Area city, use that city's center for distance calculation
  if (listing.city) {
    const listingCityNorm = normalizeCityName(listing.city);
    const bayAreaCities: Record<string, string> = {
      'san francisco': 'San Francisco',
      'sf': 'San Francisco',
      'berkeley': 'Berkeley',
      'palo alto': 'Palo Alto',
      'san jose': 'San Jose'
    };
    
    if (bayAreaCities[listingCityNorm]) {
      const listingCityKey = bayAreaCities[listingCityNorm];
      const listingCityCenter = CITY_CENTERS[listingCityKey];
      if (listingCityCenter) {
        cityCenter = listingCityCenter; // Use listing's city center for distance
      }
    }
  }
  
  if (!cityCenter) {
    return 0.5; // Neutral if city center not defined
  }

  // Calculate distance from city center
  const distance = calculateDistance(
    cityCenter.lat,
    cityCenter.lon,
    listing.latitude,
    listing.longitude
  );

  // Score decreases with distance
  // At city center (0 km) = 1.0
  // 5 km away = 0.8
  // 10 km away = 0.6
  // 20 km away = 0.2
  // 30+ km away = 0.0
  // Using exponential decay for smoother scoring
  const maxDistance = 30; // 30 km is considered "very far"
  if (distance >= maxDistance) {
    return 0;
  }
  
  // Exponential decay: score = e^(-distance/10)
  // This gives: 0km=1.0, 5km≈0.6, 10km≈0.37, 20km≈0.14
  // Normalize to ensure 0km = 1.0
  const score = Math.exp(-distance / 10);
  return Math.max(0, Math.min(1, score));
}

/**
 * Compute price proximity score to min price (SECOND MOST IMPORTANT)
 * Closer to min price = higher score
 * Returns score 0-1, where 1 = exactly at min price, decreases as price moves away
 */
function computePriceProximityScore(user: User, listing: Listing): number {
  const minBudget = user.minBudget || 0;
  const maxBudget = user.maxBudget || 0;
  const listingPrice = listing.price || 0;

  if (minBudget === 0 || maxBudget === 0 || listingPrice === 0) {
    return 0.5; // Neutral if budget not specified
  }

  // If price is within budget range, give full score
  if (listingPrice >= minBudget && listingPrice <= maxBudget) {
    return 1.0;
  }

  // Calculate distance from min price (preferred)
  let distance: number;
  if (listingPrice < minBudget) {
    // Price is below min - still acceptable but less ideal
    distance = minBudget - listingPrice;
    // Less penalty for being below (still acceptable)
    const budgetRange = maxBudget - minBudget;
    if (budgetRange === 0) return 0.5;
    // Score decreases more slowly when below min
    return Math.max(0.3, 1 - (distance / budgetRange) * 0.5);
  } else {
    // Price is above max - less acceptable
    distance = listingPrice - maxBudget;
    const budgetRange = maxBudget - minBudget;
    if (budgetRange === 0) return 0;
    // Score decreases faster when above max
    return Math.max(0, 1 - (distance / budgetRange) * 2);
  }
}

function computeListingTypeScore(user: User, listing: Listing): number {
  const userTypes = Array.isArray(user.spaceType) 
    ? user.spaceType 
    : (user.spaceType ? [user.spaceType] : []);

  // Listing type would need to be added to Listing interface
  // For now, return neutral score
  return 0.5;
}

function computeListingLeaseScore(user: User, listing: Listing): number {
  // Lease duration matching logic
  // Would need lease duration in listing
  return 0.5;
}

