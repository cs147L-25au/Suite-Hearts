export type RootStackParamList = {
  Introduction: undefined;
  SignUp: undefined;
  Home: undefined;
  Chat: { userId: string; userName: string } | undefined;
  Conversation: { userId: string; userName: string };
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
  questions: string[];
  createdAt: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  messages: Message[];
  lastMessage?: Message;
  updatedAt: number;
}