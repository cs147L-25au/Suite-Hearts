export type RootStackParamList = {
  Splash: undefined;
  Introduction: undefined;
  Login: undefined;
  SignUp: { email?: string } | undefined;
  Home: undefined;
  Chat: { userId: string; userName: string } | undefined;
  Conversation: { userId: string; userName: string };
  ListingDetail: { listingId?: string; listing?: Listing | Property };
};

export type HomeStackParamList = {
  PropertyList: undefined;
  Map: undefined;
  ListingDetail: { listingId?: string; listing?: Listing | Property };
};

export type UserType = 'homeowner' | 'searcher';
export type LookingFor = 'roommates' | 'housing' | 'both';

export interface User {
  id: string;
  userType: UserType;
  lookingFor?: LookingFor; // Only for searchers
  email: string;
  phone: string;
  name: string;
  age: string;
  race: string;
  gender: string;
  university?: string; // Optional, only for searchers
  yearsExperience?: string; // Only for homeowners
  job: string;
  jobRole?: string;
  jobPlace?: string;
  profilePicture: string | null;
  hometown: string;
  location: string;
  pets?: string; // Only for searchers
  smoking: string;
  drinking: string;
  drugs: string;
  nightOwl: string;
  religion: string;
  bio: string;
  // New lifestyle preferences
  friendliness?: number; // Scale 1-10: 1 = cordial co-habitants, 10 = best friends
  cleanliness?: number; // Scale 1-10: 1 = messy, 10 = neat freak
  guestsAllowed?: 'never' | 'with permission' | 'always okay';
  questions: string[];
  prompts?: UserPrompt[]; // Up to 3 prompts
  // New housing preferences (only for searchers looking for housing)
  maxRoommates?: number | string; // "None" or 1-6+
  roommateType?: 'roommates' | 'suitemates' | 'both'; // Roommates or suitemates or both
  preferredCity?: string; // SF, Berkeley, Palo Alto, San Jose
  preferredLatitude?: number; // Optional pinned coordinates
  preferredLongitude?: number; // Optional pinned coordinates
  spaceType?: string | string[]; // What kind of space (can be multiple)
  minBudget?: number; // Monthly budget min (must be > 400)
  maxBudget?: number; // Monthly budget max
  leaseDuration?: number | string; // "Under 1 month" to "12 months"
  createdAt: number;
}

export interface UserPrompt {
  id: string;
  promptText: string;
  answer: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string; // Optional image URL
  timestamp: number;
}

export interface Conversation {
  id: string;
  participants: string[]; // User IDs (up to 6 for group chats)
  messages: Message[];
  lastMessage?: Message;
  isGroup: boolean;
  groupName?: string; // Optional name for group chats
  updatedAt: number;
}

export interface Swipe {
  id: string;
  swiperId: string; // User who swiped
  swipedId: string; // User/Listing that was swiped on
  swipeType: 'user' | 'listing'; // Swiping on a person or listing
  direction: 'left' | 'right'; // Left = no, right = like
  createdAt: number;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  matchedAt: number;
  isActive: boolean; // Can be unmatched
}

export interface Listing {
  id: string;
  ownerId: string; // User ID of the homeowner
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  latitude: number;
  longitude: number;
  photos: string[]; // Array of photo URLs
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  availableDate?: string;
  createdAt: number;
  updatedAt: number;
}