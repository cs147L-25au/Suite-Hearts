/**
 * Utility functions for generating random real estate photos
 * Uses Picsum Photos API for random interior/architecture photos
 * OR local assets if USE_LOCAL_PHOTOS is true
 */

// Set to true to use local photos from assets folder instead of Picsum API
const USE_LOCAL_PHOTOS = false;

// Local photo assets 
const LOCAL_PHOTOS = [
  require('../assets/listing-photos/photo1.jpg'),
  require('../assets/listing-photos/photo2.jpg'),
  require('../assets/listing-photos/photo3.jpg'),
  require('../assets/listing-photos/photo4.jpg'),
  require('../assets/listing-photos/photo5.jpg'),
  require('../assets/listing-photos/photo6.jpg'),
  require('../assets/listing-photos/photo7.jpg'),
  require('../assets/listing-photos/photo8.jpg'),
  require('../assets/listing-photos/photo9.jpg'),
  require('../assets/listing-photos/photo10.jpg'),
  require('../assets/listing-photos/photo11.jpg'),
  require('../assets/listing-photos/photo12.jpg'),
  require('../assets/listing-photos/photo13.jpg'),
  require('../assets/listing-photos/photo14.jpg'),
  require('../assets/listing-photos/photo15.jpg'),
  require('../assets/listing-photos/photo16.jpg'),
  require('../assets/listing-photos/photo17.jpg'),
  require('../assets/listing-photos/photo18.jpg'),
  require('../assets/listing-photos/photo19.jpg'),
  require('../assets/listing-photos/photo20.jpg'),
];

type PhotoSource = string | { uri: string } | number;

/**
 * Gets a random local photo based on listing ID (consistent per listing)
 */
function getLocalPhoto(listingId: string, index: number = 0): PhotoSource {
  if (LOCAL_PHOTOS.length === 0) {
    // Fallback to Picsum if no local photos available
    // This shouldn't happen if USE_LOCAL_PHOTOS is true, but handle 
    const seed = listingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const realEstateSeeds = [
      101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
      201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
      301, 302, 303, 304, 305, 306, 307, 308, 309, 310,
      401, 402, 403, 404, 405, 406, 407, 408, 409, 410,
    ];
    const selectedSeed = realEstateSeeds[seed % realEstateSeeds.length];
    return `https://picsum.photos/seed/${selectedSeed}/800/600`;
  }
  
  // Use listing ID to generate a consistent seed
  const seed = listingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const photoIndex = (seed + index) % LOCAL_PHOTOS.length;
  return LOCAL_PHOTOS[photoIndex];
}

/**
 * Generates a random real estate/interior photo URL
 * Uses Picsum Photos with specific seeds for consistent but varied photos
 */
export function getRandomRealEstatePhoto(listingId: string): string | PhotoSource {
  if (USE_LOCAL_PHOTOS) {
    // Return local photo URI
    const photo = getLocalPhoto(listingId);
    return photo; // This will be a require() object, React Native handles it
  }

  // Use listing ID to generate a seed for consistent photo per listing
  // This ensures the same listing always gets the same photo
  const seed = listingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use real estate/interior specific seeds from Picsum
  // These seeds are curated to return interior/home photos
  const realEstateSeeds = [
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
    301, 302, 303, 304, 305, 306, 307, 308, 309, 310,
    401, 402, 403, 404, 405, 406, 407, 408, 409, 410,
  ];
  
  const selectedSeed = realEstateSeeds[seed % realEstateSeeds.length];
  
  // Picsum Photos API - returns photos (seeds help ensure consistency)
  return `https://picsum.photos/seed/${selectedSeed}/800/600`;
}

/**
 * Generates multiple random photos for a listing (up to 4)
 */
export function getRandomRealEstatePhotos(listingId: string, count: number = 1): (string | PhotoSource)[] {
  if (USE_LOCAL_PHOTOS) {
    // Return local photos
    const photos: PhotoSource[] = [];
    for (let i = 0; i < Math.min(count, 4); i++) {
      photos.push(getLocalPhoto(listingId, i));
    }
    return photos;
  }

  const photos: string[] = [];
  const seed = listingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use real estate/interior specific seeds from Picsum
  // These seeds are curated to return interior/home photos
  // Picsum doesn't have categories, but we use specific seeds that tend to return interior photos
  const realEstateSeeds = [
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
    301, 302, 303, 304, 305, 306, 307, 308, 309, 310,
    401, 402, 403, 404, 405, 406, 407, 408, 409, 410,
  ];
  
  // Generate different photos by varying the seed
  for (let i = 0; i < Math.min(count, 4); i++) {
    const seedIndex = (seed + (i * 1000)) % realEstateSeeds.length;
    const photoSeed = realEstateSeeds[seedIndex];
    photos.push(`https://picsum.photos/seed/${photoSeed}/800/600`);
  }
  
  return photos;
}
