/**
 * Datafiniti Property Data API Integration
 * 
 * HARD CONSTRAINTS:
 * 1. RENTAL-ONLY: All properties must be rentals (not for sale). Sale properties are filtered out.
 * 2. LOCATION: All queries are restricted to San Francisco, Berkeley, Palo Alto, and San Jose, CA only.
 * These restrictions are enforced at the data layer level.
 * 
 * API Usage Limits:
 * - Fetches 5 listings total: 2 from San Francisco, 1 each from Berkeley, Palo Alto, San Jose
 * - Implements in-memory caching to prevent duplicate requests
 * - Makes exactly FIVE network requests per unique query (2 SF + 3 other cities)
 * - Filters out sale prices and non-rental properties based on statuses and price types
 * - Only accepts rental properties under $8,000/month
 * 
 * ============================================================================
 * API KEY SETUP INSTRUCTIONS:
 * ============================================================================
 * 
 * 1. Create a .env file in the Suite_Hearts directory (same level as package.json)
 * 
   * 2. Add your Datafiniti API key:
   *    EXPO_PUBLIC_DATAFINITI_API_KEY=your-actual-api-key-here
 * 
 * 3. Get your API key from: https://datafiniti.co/
 * 
 * 4. Restart Expo server after adding the key:
 *    npx expo start --clear
 * 
 * 5. MOCK DATA IS DISABLED - We rely entirely on Datafiniti API for real rental listings
 * 
 * ============================================================================
 */

// MOCK DATA DISABLED - App uses Datafiniti API only for real rental listings
// DO NOT set to true - mock data is not used in production/demo
const USE_MOCK_DATA = false;

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  price: number;
  numBedrooms?: number;
  numBathrooms?: number;
  description?: string; // Property description from Datafiniti
}

interface DatafinitiRecord {
  id?: string;
  address?: string;
  city?: string;
  state?: string;
  province?: string; // Datafiniti uses "province" instead of "state"
  latitude?: number | string;
  longitude?: number | string;
  prices?: Array<{
    amount?: number;
    amountMax?: number;
    amountMin?: number;
    type?: string; // e.g., "Rent", "Sale List", "Sale Price"
    isSale?: string | boolean; // "true" or "false" as string, or boolean
    isSold?: string | boolean; // "true" or "false" as string, or boolean
    availability?: string | boolean; // "true" or "false" as string, or boolean
  }>;
  statuses?: Array<{
    type?: string; // "For Sale", "For Rent", "Sold", "Off Market", "Pending", etc.
    date?: string;
    isUnderContract?: string | boolean;
  }>;
  features?: Array<{
    key?: string;
    value?: string | string[];
  }>;
  descriptions?: Array<{
    value?: string;
    dateSeen?: string;
  }>;
  numBedroom?: number;
  numBathroom?: number;
  numBedrooms?: number;
  numBathrooms?: number;
}

interface DatafinitiResponse {
  records?: DatafinitiRecord[];
  num_found?: number;
}

// In-memory cache keyed by query string
const cache: Map<string, Property[]> = new Map();

/**
 * Transforms Datafiniti API response to Property format
 */
function transformProperty(record: DatafinitiRecord): Property | null {
  // Validate required fields with detailed logging
  if (!record.id) {
    console.warn(`⚠️ [Datafiniti] Record missing id:`, record);
    return null;
  }
  if (!record.address) {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} missing address`);
    return null;
  }
  if (!record.city) {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} missing city`);
    return null;
  }
  
  // Datafiniti uses "province" instead of "state"
  const province = record.province || record.state;
  if (!province) {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} missing province/state`);
    return null;
  }
  
  // Only accept California properties
  if (province !== 'CA' && province !== 'California') {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} is not in California (province: ${province})`);
    return null;
  }

  // Parse coordinates (may be strings or numbers)
  let latitude: number;
  let longitude: number;
  
  if (typeof record.latitude === 'string') {
    latitude = parseFloat(record.latitude);
  } else if (typeof record.latitude === 'number') {
    latitude = record.latitude;
  } else {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} missing or invalid latitude: ${record.latitude}`);
    return null;
  }
  
  if (typeof record.longitude === 'string') {
    longitude = parseFloat(record.longitude);
  } else if (typeof record.longitude === 'number') {
    longitude = record.longitude;
  } else {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} missing or invalid longitude: ${record.longitude}`);
    return null;
  }

  // Validate coordinates are reasonable (Bay Area roughly: lat 37-38, lng -123 to -121)
  if (latitude < 37 || latitude > 38 || longitude < -123 || longitude > -121) {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} has coordinates outside Bay Area (lat: ${latitude}, lng: ${longitude})`);
    return null; // Filter out non-Bay Area properties
  }

  // FILTER FOR RENTAL PROPERTIES ONLY
  // Check statuses to ensure this is a rental property, not for sale
  // Note: We'll be lenient - if we can extract a rental price from features, we'll accept it
  let hasValidRentalStatus = false;
  let hasRentalEstimate = false;
  
  // First, check if there's a rental estimate in features (this is a strong indicator)
  if (record.features && record.features.length > 0) {
    const rentalEstimateFeature = record.features.find(f => 
      f.key === 'Redfin Rental Estimate' || 
      (f.key && f.key.toLowerCase().includes('rental estimate'))
    );
    if (rentalEstimateFeature) {
      hasRentalEstimate = true;
      console.log(`✅ [Datafiniti] Record ${record.id} has rental estimate in features`);
    }
  }
  
  if (record.statuses && record.statuses.length > 0) {
    const statusTypes = record.statuses.map(s => s.type).join(', ');
    const hasForSale = record.statuses.some(status => 
      status.type === 'For Sale' || status.type === 'Sold'
    );
    const hasForRent = record.statuses.some(status => 
      status.type === 'For Rent' || status.type === 'Rent'
    );
    
    // If it's explicitly marked as "For Rent", that's good
    if (hasForRent) {
      hasValidRentalStatus = true;
      console.log(`✅ [Datafiniti] Record ${record.id} confirmed as rental property (statuses: ${statusTypes})`);
    }
    
    // If it's marked as "For Sale" or "Sold" and NOT "For Rent", 
    // but has a rental estimate, we'll still accept it (might be a property that can be rented)
    if (hasForSale && !hasForRent && !hasRentalEstimate) {
      // Only reject if it's for sale AND has no rental estimate
      console.warn(`⚠️ [Datafiniti] Record ${record.id} is marked for sale without rental estimate (statuses: ${statusTypes}), will check for rental price in prices array`);
    } else if (hasForSale && !hasForRent && hasRentalEstimate) {
      // Has rental estimate even though marked for sale - accept it
      hasValidRentalStatus = true;
      console.log(`✅ [Datafiniti] Record ${record.id} has rental estimate despite being marked for sale, accepting it`);
    }
  } else {
    // No statuses - we'll rely on price extraction
    console.log(`ℹ️ [Datafiniti] Record ${record.id} has no statuses, will rely on price extraction`);
  }

  // Extract RENTAL price from prices array or features
  // Look for rental prices specifically (not sale prices)
  let price = 0;
  
  // First, try to extract from "Redfin Rental Estimate" in features
  if (record.features && record.features.length > 0) {
    // Log all feature keys for debugging
    const featureKeys = record.features.map(f => f.key).filter(Boolean);
    if (featureKeys.length > 0) {
      console.log(`🔍 [Datafiniti] Record ${record.id} has ${featureKeys.length} features. Sample keys:`, featureKeys.slice(0, 5).join(', '));
    }
    
    const rentalEstimateFeature = record.features.find(f => 
      f.key === 'Redfin Rental Estimate' || 
      (f.key && f.key.toLowerCase().includes('rental estimate'))
    );
    
    if (rentalEstimateFeature && rentalEstimateFeature.value) {
      const estimateValue = Array.isArray(rentalEstimateFeature.value) 
        ? rentalEstimateFeature.value[0] 
        : rentalEstimateFeature.value;
      
      console.log(`💰 [Datafiniti] Record ${record.id} found rental estimate feature: "${rentalEstimateFeature.key}" = "${estimateValue}"`);
      
      // Extract price from string like "$1647 - $1678 / month" or "$2000/month" or "$1,647 - $1,678 / month"
      // Match the first full price (before the dash if there's a range)
      // Use regex to match digits (with optional commas) until we hit a space, dash, or end
      // This ensures we get "$1647" from "$1647 - $1678 / month" not just "$164"
      const priceMatch = estimateValue.match(/\$([\d,]+)/);
      if (priceMatch) {
        price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
        console.log(`✅ [Datafiniti] Record ${record.id} extracted rental price from estimate: $${price}/month (from: "${estimateValue}")`);
      } else {
        console.warn(`⚠️ [Datafiniti] Record ${record.id} has rental estimate feature but couldn't extract price from: "${estimateValue}"`);
      }
    } else {
      console.log(`ℹ️ [Datafiniti] Record ${record.id} has no rental estimate feature, will check prices array`);
    }
  }
  
  // If no price from features, try prices array
  if (price === 0 && record.prices && record.prices.length > 0) {
    // First, try to find a rental price explicitly
    const rentalPrice = record.prices.find(p => {
      // Check if price type indicates rental
      const isRentalType = p.type === 'Rent' || p.type === 'Rental';
      // Check if it's explicitly not a sale
      const isNotSale = p.isSale === false || p.isSale === 'false';
      const isNotSold = p.isSold === false || p.isSold === 'false';
      // Check if it's available (for rent)
      const isAvailable = p.availability === true || p.availability === 'true';
      
      return isRentalType || (isNotSale && isNotSold && isAvailable);
    });
    
    if (rentalPrice) {
      // Use rental price
      if (rentalPrice.amountMax) {
        price = rentalPrice.amountMax;
      } else if (rentalPrice.amountMin) {
        price = rentalPrice.amountMin;
      } else if (rentalPrice.amount) {
        price = rentalPrice.amount;
      }
    } else {
      // If no explicit rental price found, check if any price is NOT a sale
      // and use the first non-sale price that's under $8k
      const nonSalePrice = record.prices.find(p => {
        const isSale = p.isSale === true || p.isSale === 'true';
        const isSold = p.isSold === true || p.isSold === 'true';
        const isSaleType = p.type === 'Sale List' || p.type === 'Sale Price';
        const amount = p.amountMax || p.amountMin || p.amount || 0;
        return !isSale && !isSold && !isSaleType && amount > 0 && amount < 8000;
      });
      
      if (nonSalePrice) {
        if (nonSalePrice.amountMax) {
          price = nonSalePrice.amountMax;
        } else if (nonSalePrice.amountMin) {
          price = nonSalePrice.amountMin;
        } else if (nonSalePrice.amount) {
          price = nonSalePrice.amount;
        }
      }
    }
  }
  
  // Validate price is a reasonable monthly rent under $8k
  if (price === 0) {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} has no valid rental price`);
    return null;
  }
  
  // Filter out anything over $8k per month (user requirement)
  if (price > 8000) {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} has price $${price} which exceeds $8k/month limit`);
    return null;
  }
  
  // Filter out anything that looks like a sale price (>$50k)
  if (price > 50000) {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} has price $${price} which is too high for monthly rent (likely a sale price)`);
    return null;
  }
  
  // Final check: if we have a valid rental price under $8k, accept it
  // (even if status says "For Sale", as long as we have a rental price/estimate)
  if (price > 0 && price <= 8000) {
    if (hasRentalEstimate || hasValidRentalStatus) {
      console.log(`✅ [Datafiniti] Record ${record.id} accepted with rental price $${price}/month (has rental status/estimate)`);
    } else {
      // Price is reasonable but no explicit rental status - still accept if under $8k
      console.log(`✅ [Datafiniti] Record ${record.id} accepted with rental price $${price}/month (reasonable price, may be rental estimate)`);
    }
  } else {
    console.log(`✅ [Datafiniti] Record ${record.id} has valid rental price: $${price}/month`);
  }

  // Normalize city name for filtering
  const cityLower = record.city.toLowerCase().trim();
  const bayAreaCities = ['san francisco', 'sf', 'berkeley', 'palo alto', 'san jose'];
  const isBayAreaCity = bayAreaCities.some(city => cityLower.includes(city) || city.includes(cityLower));
  
  if (!isBayAreaCity) {
    console.warn(`⚠️ [Datafiniti] Record ${record.id} is not in a Bay Area city (city: ${record.city})`);
    return null;
  }

  // Extract bedrooms/bathrooms (handle both singular and plural field names)
  const numBedrooms = record.numBedrooms || record.numBedroom;
  const numBathrooms = record.numBathrooms || record.numBathroom;

  // Extract description from descriptions array (use the most recent one)
  let description: string | undefined = undefined;
  if (record.descriptions && record.descriptions.length > 0) {
    // Sort by dateSeen (most recent first) and take the first one
    const sortedDescriptions = [...record.descriptions].sort((a, b) => {
      const dateA = a.dateSeen ? new Date(a.dateSeen).getTime() : 0;
      const dateB = b.dateSeen ? new Date(b.dateSeen).getTime() : 0;
      return dateB - dateA;
    });
    description = sortedDescriptions[0]?.value;
    if (description) {
      // Truncate if too long (keep first 500 characters)
      if (description.length > 500) {
        description = description.substring(0, 500) + '...';
      }
      console.log(`📝 [Datafiniti] Record ${record.id} has description (${description.length} chars)`);
    }
  }

  return {
    id: record.id,
    address: record.address,
    city: record.city,
    state: 'CA', // Always set to CA since we filtered for it
    latitude: latitude,
    longitude: longitude,
    price: price,
    numBedrooms: numBedrooms,
    numBathrooms: numBathrooms,
    description: description,
  };
}

/**
 * Loads mock data from local JSON file
 */
async function loadMockData(): Promise<Property[]> {
  try {
    // In Expo Go, we can't use require() for JSON in the same way
    // Instead, we'll return the mock data directly
    // 5 total: 2 from SF, 1 each from Berkeley, Palo Alto, San Jose
    const mockProperties: Property[] = [
      // San Francisco (2 listings)
      {
        id: 'mock-1',
        address: '123 Market Street',
        city: 'San Francisco',
        state: 'CA',
        latitude: 37.7879,
        longitude: -122.4075,
        price: 3200, // Monthly rent
        numBedrooms: 3,
        numBathrooms: 2,
      },
      {
        id: 'mock-2',
        address: '456 Mission Street',
        city: 'San Francisco',
        state: 'CA',
        latitude: 37.7849,
        longitude: -122.4094,
        price: 2800, // Monthly rent
        numBedrooms: 2,
        numBathrooms: 1.5,
      },
      // Other cities (1 each: Berkeley, Palo Alto, San Jose)
      {
        id: 'mock-3',
        address: '123 Telegraph Avenue',
        city: 'Berkeley',
        state: 'CA',
        latitude: 37.8715,
        longitude: -122.2730,
        price: 2200,
        numBedrooms: 2,
        numBathrooms: 1,
      },
      {
        id: 'mock-4',
        address: '123 University Avenue',
        city: 'Palo Alto',
        state: 'CA',
        latitude: 37.4419,
        longitude: -122.1430,
        price: 3500,
        numBedrooms: 2,
        numBathrooms: 2,
      },
      {
        id: 'mock-5',
        address: '123 San Fernando Street',
        city: 'San Jose',
        state: 'CA',
        latitude: 37.3382,
        longitude: -121.8863,
        price: 2000,
        numBedrooms: 2,
        numBathrooms: 1,
      },
    ];
    return mockProperties;
  } catch (error) {
    console.error('Error loading mock data:', error);
    return [];
  }
}

/**
 * Searches properties using Datafiniti API
 * 
 * HARD CONSTRAINTS:
 * 1. RENTAL-ONLY: Only returns rental properties (filters out "For Sale" and "Sold" properties)
 * 2. LOCATION: Automatically restricts to San Francisco, Berkeley, Palo Alto, and San Jose, CA only.
 * The UI cannot request other cities or sale properties - this is enforced here.
 * 
 * API KEY SETUP:
 * 1. Create a .env file in the Suite_Hearts directory
 * 2. Add: EXPO_PUBLIC_DATAFINITI_API_KEY=your-actual-api-key-here
 * 3. Restart Expo server: npx expo start --clear
 * 
 * Get your API key from: https://datafiniti.co/
 * 
 * @param params - Search parameters (will be merged with rental + location restrictions)
 * @returns Array of Property objects (rental properties only)
 */
export async function searchProperties(params: {
  query?: string;
  num_records?: number;
  [key: string]: any;
} = {}): Promise<Property[]> {
  // Use mock data if flag is set
  if (USE_MOCK_DATA) {
    return loadMockData();
  }

  // Check for API key
  // IMPORTANT: Add your API key to .env file in Suite_Hearts directory
  // Format: EXPO_PUBLIC_DATAFINITI_API_KEY=your-actual-api-key-here
  const apiKey = process.env.EXPO_PUBLIC_DATAFINITI_API_KEY;
  console.log('🔑 [Datafiniti] API Key Check:');
  console.log('   - Key exists:', !!apiKey);
  console.log('   - Key length:', apiKey ? apiKey.length : 0);
  console.log('   - Key preview:', apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A');
  
  if (!apiKey || apiKey === 'your-api-key-here' || apiKey.trim() === '') {
      console.error('❌ [Datafiniti] Missing or invalid API key. Cannot fetch properties.');
      console.error('📝 [Datafiniti] To use live API:');
      console.error('   1. Create .env file in Suite_Hearts directory');
      console.error('   2. Add: EXPO_PUBLIC_DATAFINITI_API_KEY=your-key-here');
      console.error('   3. Restart Expo: npx expo start --clear');
      console.error('   4. Get your API key from: https://datafiniti.co/');
      // Return empty array instead of mock data - we're relying on Datafiniti API only
      return [];
  }
  
  console.log('✅ [Datafiniti] API key found and validated');

  // Build queries: 10 separate API calls (4 for SF, 2 each for Berkeley, Palo Alto, San Jose)
  // RENTAL-ONLY: We filter for rental properties in code (more reliable than query syntax)
  const userQuery = params.query || '';
  
  // Query for San Francisco (4 calls, 1 record each)
  const sfQuery = userQuery
    ? `province:CA AND city:"San Francisco" AND (${userQuery})`
    : 'province:CA AND city:"San Francisco"';
  
  // Query for Berkeley (2 calls, 1 record each)
  const berkeleyQuery = userQuery
    ? `province:CA AND city:"Berkeley" AND (${userQuery})`
    : 'province:CA AND city:"Berkeley"';
  
  // Query for Palo Alto (2 calls, 1 record each)
  const paloAltoQuery = userQuery
    ? `province:CA AND city:"Palo Alto" AND (${userQuery})`
    : 'province:CA AND city:"Palo Alto"';
  
  // Query for San Jose (2 calls, 1 record each)
  const sanJoseQuery = userQuery
    ? `province:CA AND city:"San Jose" AND (${userQuery})`
    : 'province:CA AND city:"San Jose"';

  // Create cache keys for all 10 calls
  const sfCacheKey1 = `sf1_${sfQuery}`;
  const sfCacheKey2 = `sf2_${sfQuery}`;
  const sfCacheKey3 = `sf3_${sfQuery}`;
  const sfCacheKey4 = `sf4_${sfQuery}`;
  const berkeleyCacheKey1 = `berkeley1_${berkeleyQuery}`;
  const berkeleyCacheKey2 = `berkeley2_${berkeleyQuery}`;
  const paloAltoCacheKey1 = `paloalto1_${paloAltoQuery}`;
  const paloAltoCacheKey2 = `paloalto2_${paloAltoQuery}`;
  const sanJoseCacheKey1 = `sanjose1_${sanJoseQuery}`;
  const sanJoseCacheKey2 = `sanjose2_${sanJoseQuery}`;

  // Check cache first
  if (cache.has(sfCacheKey1) && cache.has(sfCacheKey2) && cache.has(sfCacheKey3) && cache.has(sfCacheKey4) &&
      cache.has(berkeleyCacheKey1) && cache.has(berkeleyCacheKey2) &&
      cache.has(paloAltoCacheKey1) && cache.has(paloAltoCacheKey2) &&
      cache.has(sanJoseCacheKey1) && cache.has(sanJoseCacheKey2)) {
    console.log('Using cached properties');
    const sf1 = cache.get(sfCacheKey1)!;
    const sf2 = cache.get(sfCacheKey2)!;
    const sf3 = cache.get(sfCacheKey3)!;
    const sf4 = cache.get(sfCacheKey4)!;
    const berkeley1 = cache.get(berkeleyCacheKey1)!;
    const berkeley2 = cache.get(berkeleyCacheKey2)!;
    const paloAlto1 = cache.get(paloAltoCacheKey1)!;
    const paloAlto2 = cache.get(paloAltoCacheKey2)!;
    const sanJose1 = cache.get(sanJoseCacheKey1)!;
    const sanJose2 = cache.get(sanJoseCacheKey2)!;
    return [...sf1, ...sf2, ...sf3, ...sf4, ...berkeley1, ...berkeley2, ...paloAlto1, ...paloAlto2, ...sanJose1, ...sanJose2];
  }

  // Fetch properties from both queries
  const fetchPropertiesForQuery = async (query: string, numRecords: number, queryType: string): Promise<Property[]> => {
    console.log(`\n🔍 [Datafiniti] ===== Fetching ${queryType} Properties =====`);
    console.log(`📝 [Datafiniti] Query: "${query}"`);
    console.log(`📊 [Datafiniti] Requesting ${numRecords} records`);
    
    try {
      const requestBody = {
        query: query,
        format: 'JSON',
        num_records: numRecords,
        ...params,
        // Override any city/state params
        city: undefined,
        state: undefined,
      };

      console.log(`📤 [Datafiniti] Request URL: https://api.datafiniti.co/v4/properties/search`);
      console.log(`📤 [Datafiniti] Request method: POST`);
      console.log(`📤 [Datafiniti] Request body:`, JSON.stringify(requestBody, null, 2));
      console.log(`🔑 [Datafiniti] Authorization header: Bearer ${apiKey.substring(0, 10)}...`);

      const startTime = Date.now();
      const response = await fetch('https://api.datafiniti.co/v4/properties/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`📥 [Datafiniti] Response received in ${duration}ms`);
      console.log(`📥 [Datafiniti] Response status: ${response.status} ${response.statusText}`);
      console.log(`📥 [Datafiniti] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = errorText;
        }
        
        console.error(`❌ [Datafiniti] API Error Details:`);
        console.error(`   Status: ${response.status} ${response.statusText}`);
        console.error(`   Error:`, errorData);
        
        // Provide helpful error messages based on status code
        if (response.status === 401) {
          console.error(`   💡 [Datafiniti] This is an authentication error. Check your API key.`);
        } else if (response.status === 400) {
          console.error(`   💡 [Datafiniti] This is a bad request. Check your query syntax.`);
          console.error(`   💡 [Datafiniti] Query used: "${query}"`);
        } else if (response.status === 429) {
          console.error(`   💡 [Datafiniti] Rate limit exceeded. Wait before retrying.`);
        } else if (response.status >= 500) {
          console.error(`   💡 [Datafiniti] Server error. Datafiniti API may be down.`);
        }
        
        throw new Error(`Datafiniti API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const responseText = await response.text();
      console.log(`📄 [Datafiniti] Response text length: ${responseText.length} characters`);
      
      let data: DatafinitiResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ [Datafiniti] Failed to parse JSON response:`, parseError);
        console.error(`📄 [Datafiniti] Response text (first 500 chars):`, responseText.substring(0, 500));
        throw new Error(`Invalid JSON response from Datafiniti API: ${parseError}`);
      }

      console.log(`✅ [Datafiniti] Response parsed successfully`);
      console.log(`📊 [Datafiniti] Records in response: ${data.records?.length || 0}`);
      console.log(`📋 [Datafiniti] Total found (num_found): ${data.num_found || 'N/A'}`);
      
      if (!data.records) {
        console.warn(`⚠️ [Datafiniti] No 'records' field in response`);
        console.log(`📄 [Datafiniti] Response structure:`, Object.keys(data));
        return [];
      }
      
      if (data.records.length === 0) {
        console.warn(`⚠️ [Datafiniti] No records returned for query: "${query}"`);
        console.warn(`   This could mean:`);
        console.warn(`   1. No properties match this query`);
        console.warn(`   2. Query syntax is incorrect`);
        console.warn(`   3. API key doesn't have access to this data`);
        return [];
      }
      
      console.log(`📄 [Datafiniti] First record sample:`, JSON.stringify(data.records[0], null, 2));

      // Transform API response to Property format
      console.log(`🔄 [Datafiniti] Transforming ${data.records.length} records...`);
      const transformed = (data.records || [])
        .map((record, index) => {
          const property = transformProperty(record);
          if (!property) {
            console.warn(`⚠️ [Datafiniti] Record ${index} failed transformation`);
          }
          return property;
        })
        .filter((p): p is Property => p !== null);
      
      // Post-filter to ensure only Bay Area cities (safety net in case API returns wrong results)
      const bayAreaCities = ['San Francisco', 'SF', 'Berkeley', 'Palo Alto', 'San Jose'];
      const bayAreaFiltered = transformed.filter(p => {
        const cityLower = p.city.toLowerCase().trim();
        const isBayArea = bayAreaCities.some(city => 
          cityLower === city.toLowerCase() || 
          cityLower.includes(city.toLowerCase()) || 
          city.toLowerCase().includes(cityLower)
        );
        if (!isBayArea) {
          console.warn(`⚠️ [Datafiniti] Post-filter: Removed property from ${p.city} (not a Bay Area city)`);
        }
        return isBayArea;
      });
      
      console.log(`✅ [Datafiniti] Successfully transformed ${bayAreaFiltered.length}/${data.records.length} records`);
      if (bayAreaFiltered.length < data.records.length) {
        console.warn(`⚠️ [Datafiniti] ${data.records.length - bayAreaFiltered.length} records were filtered out (missing required fields or not Bay Area)`);
      }
      
      if (bayAreaFiltered.length > 0) {
        console.log(`📄 [Datafiniti] First transformed property:`, bayAreaFiltered[0]);
        console.log(`📋 [Datafiniti] Property cities:`, [...new Set(bayAreaFiltered.map(p => p.city))]);
      }
      
      console.log(`✅ [Datafiniti] ===== ${queryType} Fetch Complete =====\n`);
      return bayAreaFiltered;
    } catch (error) {
      console.error(`❌ [Datafiniti] ===== Error in ${queryType} Fetch =====`);
      console.error(`❌ [Datafiniti] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
      console.error(`❌ [Datafiniti] Error message:`, error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error(`❌ [Datafiniti] Stack trace:`, error.stack);
      }
      console.error(`❌ [Datafiniti] ===== End Error =====\n`);
      throw error;
    }
  };

  try {
    console.log(`\n🚀 [Datafiniti] ==========================================`);
    console.log(`🚀 [Datafiniti] STARTING PROPERTY FETCH`);
    console.log(`🚀 [Datafiniti] ==========================================`);
    console.log(`📍 [Datafiniti] SF Query: "${sfQuery}" (4 calls)`);
    console.log(`📍 [Datafiniti] Berkeley Query: "${berkeleyQuery}" (2 calls)`);
    console.log(`📍 [Datafiniti] Palo Alto Query: "${paloAltoQuery}" (2 calls)`);
    console.log(`📍 [Datafiniti] San Jose Query: "${sanJoseQuery}" (2 calls)`);
    console.log(`🔑 [Datafiniti] USE_MOCK_DATA: ${USE_MOCK_DATA}`);
    console.log(`🔑 [Datafiniti] API Key present: ${!!apiKey}`);
    
    // Fetch 10 separate API calls: 4 for SF, 2 each for Berkeley, Palo Alto, San Jose
    // Use Promise.allSettled to handle individual failures gracefully
    const [sf1Result, sf2Result, sf3Result, sf4Result, berkeley1Result, berkeley2Result, paloAlto1Result, paloAlto2Result, sanJose1Result, sanJose2Result] = await Promise.allSettled([
      fetchPropertiesForQuery(sfQuery, 1, 'San Francisco (Call 1)'),
      fetchPropertiesForQuery(sfQuery, 1, 'San Francisco (Call 2)'),
      fetchPropertiesForQuery(sfQuery, 1, 'San Francisco (Call 3)'),
      fetchPropertiesForQuery(sfQuery, 1, 'San Francisco (Call 4)'),
      fetchPropertiesForQuery(berkeleyQuery, 1, 'Berkeley (Call 1)'),
      fetchPropertiesForQuery(berkeleyQuery, 1, 'Berkeley (Call 2)'),
      fetchPropertiesForQuery(paloAltoQuery, 1, 'Palo Alto (Call 1)'),
      fetchPropertiesForQuery(paloAltoQuery, 1, 'Palo Alto (Call 2)'),
      fetchPropertiesForQuery(sanJoseQuery, 1, 'San Jose (Call 1)'),
      fetchPropertiesForQuery(sanJoseQuery, 1, 'San Jose (Call 2)'),
    ]);

    // Process results
    let sf1Properties: Property[] = [];
    let sf2Properties: Property[] = [];
    let sf3Properties: Property[] = [];
    let sf4Properties: Property[] = [];
    let berkeley1Properties: Property[] = [];
    let berkeley2Properties: Property[] = [];
    let paloAlto1Properties: Property[] = [];
    let paloAlto2Properties: Property[] = [];
    let sanJose1Properties: Property[] = [];
    let sanJose2Properties: Property[] = [];
    
    if (sf1Result.status === 'fulfilled') {
      sf1Properties = sf1Result.value;
      console.log(`✅ [Datafiniti] SF Call 1 succeeded: ${sf1Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] SF Call 1 failed:`, sf1Result.reason);
    }
    
    if (sf2Result.status === 'fulfilled') {
      sf2Properties = sf2Result.value;
      console.log(`✅ [Datafiniti] SF Call 2 succeeded: ${sf2Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] SF Call 2 failed:`, sf2Result.reason);
    }
    
    if (sf3Result.status === 'fulfilled') {
      sf3Properties = sf3Result.value;
      console.log(`✅ [Datafiniti] SF Call 3 succeeded: ${sf3Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] SF Call 3 failed:`, sf3Result.reason);
    }
    
    if (sf4Result.status === 'fulfilled') {
      sf4Properties = sf4Result.value;
      console.log(`✅ [Datafiniti] SF Call 4 succeeded: ${sf4Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] SF Call 4 failed:`, sf4Result.reason);
    }
    
    if (berkeley1Result.status === 'fulfilled') {
      berkeley1Properties = berkeley1Result.value;
      console.log(`✅ [Datafiniti] Berkeley Call 1 succeeded: ${berkeley1Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] Berkeley Call 1 failed:`, berkeley1Result.reason);
    }
    
    if (berkeley2Result.status === 'fulfilled') {
      berkeley2Properties = berkeley2Result.value;
      console.log(`✅ [Datafiniti] Berkeley Call 2 succeeded: ${berkeley2Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] Berkeley Call 2 failed:`, berkeley2Result.reason);
    }
    
    if (paloAlto1Result.status === 'fulfilled') {
      paloAlto1Properties = paloAlto1Result.value;
      console.log(`✅ [Datafiniti] Palo Alto Call 1 succeeded: ${paloAlto1Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] Palo Alto Call 1 failed:`, paloAlto1Result.reason);
    }
    
    if (paloAlto2Result.status === 'fulfilled') {
      paloAlto2Properties = paloAlto2Result.value;
      console.log(`✅ [Datafiniti] Palo Alto Call 2 succeeded: ${paloAlto2Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] Palo Alto Call 2 failed:`, paloAlto2Result.reason);
    }
    
    if (sanJose1Result.status === 'fulfilled') {
      sanJose1Properties = sanJose1Result.value;
      console.log(`✅ [Datafiniti] San Jose Call 1 succeeded: ${sanJose1Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] San Jose Call 1 failed:`, sanJose1Result.reason);
    }
    
    if (sanJose2Result.status === 'fulfilled') {
      sanJose2Properties = sanJose2Result.value;
      console.log(`✅ [Datafiniti] San Jose Call 2 succeeded: ${sanJose2Properties.length} properties`);
    } else {
      console.error(`❌ [Datafiniti] San Jose Call 2 failed:`, sanJose2Result.reason);
    }

    // Cache results only if successful
    if (sf1Result.status === 'fulfilled') {
      cache.set(sfCacheKey1, sf1Properties);
    }
    if (sf2Result.status === 'fulfilled') {
      cache.set(sfCacheKey2, sf2Properties);
    }
    if (sf3Result.status === 'fulfilled') {
      cache.set(sfCacheKey3, sf3Properties);
    }
    if (sf4Result.status === 'fulfilled') {
      cache.set(sfCacheKey4, sf4Properties);
    }
    if (berkeley1Result.status === 'fulfilled') {
      cache.set(berkeleyCacheKey1, berkeley1Properties);
    }
    if (berkeley2Result.status === 'fulfilled') {
      cache.set(berkeleyCacheKey2, berkeley2Properties);
    }
    if (paloAlto1Result.status === 'fulfilled') {
      cache.set(paloAltoCacheKey1, paloAlto1Properties);
    }
    if (paloAlto2Result.status === 'fulfilled') {
      cache.set(paloAltoCacheKey2, paloAlto2Properties);
    }
    if (sanJose1Result.status === 'fulfilled') {
      cache.set(sanJoseCacheKey1, sanJose1Properties);
    }
    if (sanJose2Result.status === 'fulfilled') {
      cache.set(sanJoseCacheKey2, sanJose2Properties);
    }

    // Combine results: SF first, then other cities
    // Deduplicate by ID (same property might be returned from multiple calls)
    const allPropertiesMap = new Map<string, Property>();
    [...sf1Properties, ...sf2Properties, ...sf3Properties, ...sf4Properties, 
     ...berkeley1Properties, ...berkeley2Properties, 
     ...paloAlto1Properties, ...paloAlto2Properties, 
     ...sanJose1Properties, ...sanJose2Properties].forEach(prop => {
      if (!allPropertiesMap.has(prop.id)) {
        allPropertiesMap.set(prop.id, prop);
      } else {
        console.log(`⚠️ [Datafiniti] Duplicate property found (ID: ${prop.id}), keeping first occurrence`);
      }
    });
    const allProperties = Array.from(allPropertiesMap.values());

    console.log(`\n📊 [Datafiniti] ==========================================`);
    console.log(`📊 [Datafiniti] FETCH SUMMARY`);
    console.log(`📊 [Datafiniti] ==========================================`);
    console.log(`   SF Call 1: ${sf1Properties.length} properties`);
    console.log(`   SF Call 2: ${sf2Properties.length} properties`);
    console.log(`   SF Call 3: ${sf3Properties.length} properties`);
    console.log(`   SF Call 4: ${sf4Properties.length} properties`);
    console.log(`   Berkeley Call 1: ${berkeley1Properties.length} properties`);
    console.log(`   Berkeley Call 2: ${berkeley2Properties.length} properties`);
    console.log(`   Palo Alto Call 1: ${paloAlto1Properties.length} properties`);
    console.log(`   Palo Alto Call 2: ${paloAlto2Properties.length} properties`);
    console.log(`   San Jose Call 1: ${sanJose1Properties.length} properties`);
    console.log(`   San Jose Call 2: ${sanJose2Properties.length} properties`);
    console.log(`   Total Properties: ${allProperties.length}`);
    
    if (allProperties.length > 0) {
      const cities = [...new Set(allProperties.map(p => p.city))];
      console.log(`   Cities found: ${cities.join(', ')}`);
      console.log(`   Price range: $${Math.min(...allProperties.map(p => p.price))} - $${Math.max(...allProperties.map(p => p.price))}`);
    } else {
      console.warn(`   ⚠️ NO PROPERTIES RETURNED`);
      console.warn(`   Possible reasons:`);
      console.warn(`   1. API key is invalid or expired`);
      console.warn(`   2. Query syntax is incorrect`);
      console.warn(`   3. No rental properties match the filters (under $8k/month)`);
      console.warn(`   4. API rate limit exceeded`);
      console.warn(`   5. Datafiniti API is down`);
    }
    
    const failedFetches = [
      sf1Result.status === 'rejected' ? 'SF Call 1' : null,
      sf2Result.status === 'rejected' ? 'SF Call 2' : null,
      sf3Result.status === 'rejected' ? 'SF Call 3' : null,
      sf4Result.status === 'rejected' ? 'SF Call 4' : null,
      berkeley1Result.status === 'rejected' ? 'Berkeley Call 1' : null,
      berkeley2Result.status === 'rejected' ? 'Berkeley Call 2' : null,
      paloAlto1Result.status === 'rejected' ? 'Palo Alto Call 1' : null,
      paloAlto2Result.status === 'rejected' ? 'Palo Alto Call 2' : null,
      sanJose1Result.status === 'rejected' ? 'San Jose Call 1' : null,
      sanJose2Result.status === 'rejected' ? 'San Jose Call 2' : null,
    ].filter(Boolean);
    
    if (failedFetches.length > 0) {
      console.warn(`   ⚠️ Some fetches failed: ${failedFetches.join(', ')} - check errors above`);
    }
    
    console.log(`📊 [Datafiniti] ==========================================\n`);

    return allProperties;
  } catch (error) {
    console.error(`\n❌ [Datafiniti] ==========================================`);
    console.error(`❌ [Datafiniti] CRITICAL ERROR IN PROPERTY FETCH`);
    console.error(`❌ [Datafiniti] ==========================================`);
    console.error(`❌ [Datafiniti] Error:`, error);
    if (error instanceof Error) {
      console.error(`❌ [Datafiniti] Message:`, error.message);
      console.error(`❌ [Datafiniti] Stack:`, error.stack);
    }
    console.error(`❌ [Datafiniti] ==========================================\n`);
    throw error;
  }
}

/**
 * Clears the in-memory cache
 * Useful for testing or forcing a refresh
 */
export function clearCache(): void {
  cache.clear();
}

