import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserType, LookingFor, Message, Conversation } from '../types';
import { supabase } from '../lib/supabase';
import { mockUsers } from '../mock/mockUsers';

interface UserContextType {
  currentUser: User | null;
  users: User[];
  conversations: Conversation[];
  likedListings: string[];
  isLoaded: boolean;
  setCurrentUser: (user: User | null) => void;
  addUser: (user: User) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  getUserById: (userId: string) => User | undefined;
  getUsersByCategory: () => {
    listers: User[];
    searchersRoommates: User[];
    searchersHousing: User[];
    searchersBoth: User[];
  };
  sendMessage: (senderId: string, receiverId: string, text: string, imageUrl?: string) => Promise<void>;
  getConversation: (userId1: string, userId2: string) => Conversation | undefined;
  getConversationsForUser: (userId: string) => Conversation[];
  deleteConversation: (conversationId: string) => Promise<void>;
  createGroupConversation: (participantIds: string[], groupName: string) => Promise<Conversation>;
  addParticipantToGroup: (conversationId: string, userId: string) => Promise<boolean>;
  removeParticipantFromGroup: (conversationId: string, userId: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<void>;
  addLikedListing: (listingId: string) => Promise<void>;
  removeLikedListing: (listingId: string) => Promise<void>;
  isListingLiked: (listingId: string) => boolean;
  syncUserFromSupabase: (userId: string, email: string) => Promise<void>;
  convertUserAccountType: (userId: string, newLookingFor: 'both') => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: '@suite_hearts:users',
  CURRENT_USER: '@suite_hearts:current_user',
  CONVERSATIONS: '@suite_hearts:conversations',
  LIKED_LISTINGS: '@suite_hearts:liked_listings',
};

// Generate a UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [likedListings, setLikedListings] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync user from Supabase helper function
  const syncUserFromSupabase = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.log('User not found in Supabase, using local data');
        return;
      }

      // Parse space_type if it's a JSON string
      let spaceType: string | string[] | undefined = undefined;
      if (data.space_type) {
        try {
          const parsed = JSON.parse(data.space_type);
          spaceType = Array.isArray(parsed) ? parsed : data.space_type;
        } catch {
          spaceType = data.space_type;
        }
      }

      // Parse prompts if it's a JSON string
      let prompts: UserPrompt[] | undefined = undefined;
      if (data.prompts) {
        try {
          const parsed = JSON.parse(data.prompts);
          prompts = Array.isArray(parsed) ? parsed : undefined;
        } catch {
          prompts = undefined;
        }
      }

      // Convert Supabase user to app User format
      const syncedUser: User = {
        id: data.id,
        userType: data.user_type as 'homeowner' | 'searcher',
        lookingFor: data.looking_for as 'roommates' | 'housing' | 'both' | undefined,
        email: data.email,
        phone: data.phone,
        name: data.name,
        age: data.age || '',
        race: data.race || '',
        gender: data.gender || '',
        university: data.university || undefined,
        yearsExperience: data.years_experience || undefined,
        job: data.job || '',
        jobRole: data.job_role || undefined,
        jobPlace: data.job_place || undefined,
        profilePicture: data.profile_picture_url || null,
        hometown: data.hometown || '',
        location: data.location || '',
        pets: data.pets || undefined,
        smoking: data.smoking || '',
        drinking: data.drinking || '',
        drugs: data.drugs || '',
        nightOwl: data.night_owl || '',
        religion: data.religion || '',
        bio: data.bio || '',
        questions: data.questions || [],
        prompts: prompts,
        maxRoommates: data.max_roommates || undefined,
        roommateType: data.roommate_type || undefined,
        preferredCity: data.preferred_city || undefined,
        preferredLatitude: data.preferred_latitude || undefined,
        preferredLongitude: data.preferred_longitude || undefined,
        spaceType: spaceType,
        minBudget: data.min_budget ? Number(data.min_budget) : undefined,
        maxBudget: data.max_budget ? Number(data.max_budget) : undefined,
        leaseDuration: data.lease_duration || undefined,
        friendliness: data.friendliness !== null && data.friendliness !== undefined ? Number(data.friendliness) : undefined,
        cleanliness: data.cleanliness !== null && data.cleanliness !== undefined ? Number(data.cleanliness) : undefined,
        guestsAllowed: data.guests_allowed ? (data.guests_allowed as 'never' | 'with permission' | 'always okay') : undefined,
        createdAt: new Date(data.created_at).getTime(),
      };
      
      console.log('📥 Synced from Supabase - friendliness:', syncedUser.friendliness, 'cleanliness:', syncedUser.cleanliness, 'guestsAllowed:', syncedUser.guestsAllowed);

      // Update current user and users array with synced data
      // Use functional update to ensure we have the latest state (including mock users)
      setUsers(prevUsers => {
        const updatedUsers = prevUsers.map(user =>
          user.id === userId ? syncedUser : user
        );
        
        // If user doesn't exist in local array, add them
        if (!prevUsers.find(u => u.id === userId)) {
          updatedUsers.push(syncedUser);
        }
        
        // Save to AsyncStorage
        AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers)).catch(err => {
          console.error('Error saving users to AsyncStorage:', err);
        });
        
        return updatedUsers;
      });
      
      setCurrentUserState(syncedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(syncedUser));
    } catch (error) {
      console.error('Error syncing user from Supabase:', error);
    }
  };

  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveData();
    }
  }, [users, currentUser, conversations, isLoaded]);

  const loadData = async () => {
    try {
      const [usersData, currentUserData, conversationsData, likedListingsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
        AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.LIKED_LISTINGS),
      ]);

      let parsedUsers: User[] = [];
      if (usersData) {
        parsedUsers = JSON.parse(usersData);
      }
      
      let localUser: User | null = null;
      if (currentUserData) {
        localUser = JSON.parse(currentUserData);
        setCurrentUserState(localUser);
      }
      
      // Always merge mock users with existing users (mock users are for swiping/testing)
      // Filter out current user from parsed users for counting
      const usersWithoutCurrent = localUser 
        ? parsedUsers.filter(u => u.id !== localUser!.id)
        : parsedUsers;
      
      try {
        // Filter out current user and existing users from mock users to avoid duplicates
        const existingUserIds = new Set(parsedUsers.map(u => u.id));
        const filteredMockUsers = mockUsers.filter(u => 
          !existingUserIds.has(u.id) && (!localUser || u.id !== localUser.id)
        );
        
        // Combine: current user (if exists) + existing users + mock users
        const combinedUsers = localUser 
          ? [localUser, ...usersWithoutCurrent, ...filteredMockUsers]
          : [...parsedUsers, ...filteredMockUsers];
        
        setUsers(combinedUsers);
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(combinedUsers));
        console.log('Added mock users. Total users:', combinedUsers.length, 'Mock users added:', filteredMockUsers.length);
      } catch (error) {
        console.error('Error loading mock users:', error);
        // Fallback: just use existing users
        setUsers(parsedUsers);
        console.log('Loaded existing users. Total users:', parsedUsers.length);
      }
      
      // Sync user data from Supabase if available (async, don't wait)
      if (localUser?.id && localUser?.email) {
        syncUserFromSupabase(localUser.id, localUser.email).catch(err => {
          console.error('Error syncing user on load:', err);
        });
      }
      
      if (conversationsData) {
        setConversations(JSON.parse(conversationsData));
      }
      if (likedListingsData) {
        setLikedListings(JSON.parse(likedListingsData));
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoaded(true);
    }
  };

  const saveData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser)),
        AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations)),
      ]);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const setCurrentUser = async (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  };

  const addUser = async (user: User) => {
    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    // If updates is a full User object, use it directly
    const isFullUser = 'id' in updates && updates.id === userId;
    
    let updatedUsers: User[];
    if (isFullUser && !users.find(u => u.id === userId)) {
      // Add new user if they don't exist
      updatedUsers = [...users, updates as User];
    } else {
      // Update existing user
      updatedUsers = users.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      );
    }
    
    setUsers(updatedUsers);
    
    // Update current user if it's the one being updated
    if (currentUser?.id === userId) {
      setCurrentUserState({ ...currentUser, ...updates });
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

    // Also update in Supabase
    try {
      const supabaseUpdates: any = {};
      
      // Map User fields to Supabase column names
      if ('friendliness' in updates) {
        const value = updates.friendliness;
        if (value !== null && value !== undefined && value !== '') {
          supabaseUpdates.friendliness = Number(value);
        } else {
          supabaseUpdates.friendliness = null;
        }
        console.log('💾 Saving friendliness to Supabase:', supabaseUpdates.friendliness, 'from:', value);
      }
      if ('cleanliness' in updates) {
        const value = updates.cleanliness;
        if (value !== null && value !== undefined && value !== '') {
          supabaseUpdates.cleanliness = Number(value);
        } else {
          supabaseUpdates.cleanliness = null;
        }
        console.log('💾 Saving cleanliness to Supabase:', supabaseUpdates.cleanliness, 'from:', value);
      }
      if ('guestsAllowed' in updates) {
        const value = updates.guestsAllowed;
        supabaseUpdates.guests_allowed = (value && value !== '') ? value : null;
        console.log('💾 Saving guestsAllowed to Supabase:', supabaseUpdates.guests_allowed, 'from:', value);
      }
      if ('minBudget' in updates) {
        supabaseUpdates.min_budget = updates.minBudget !== null && updates.minBudget !== undefined 
          ? Number(updates.minBudget) 
          : null;
      }
      if ('maxBudget' in updates) {
        supabaseUpdates.max_budget = updates.maxBudget !== null && updates.maxBudget !== undefined 
          ? Number(updates.maxBudget) 
          : null;
      }
      if ('maxRoommates' in updates) {
        supabaseUpdates.max_roommates = updates.maxRoommates !== null && updates.maxRoommates !== undefined 
          ? (typeof updates.maxRoommates === 'number' ? updates.maxRoommates : null)
          : null;
      }
      if ('roommateType' in updates) {
        supabaseUpdates.roommate_type = updates.roommateType || null;
      }
      if ('preferredCity' in updates) {
        supabaseUpdates.preferred_city = updates.preferredCity || null;
      }
      if ('spaceType' in updates) {
        if (Array.isArray(updates.spaceType)) {
          supabaseUpdates.space_type = JSON.stringify(updates.spaceType);
        } else {
          supabaseUpdates.space_type = updates.spaceType || null;
        }
      }
      if ('leaseDuration' in updates) {
        supabaseUpdates.lease_duration = updates.leaseDuration !== null && updates.leaseDuration !== undefined
          ? (typeof updates.leaseDuration === 'number' ? updates.leaseDuration : null)
          : null;
      }
      if ('profilePicture' in updates) {
        supabaseUpdates.profile_picture_url = updates.profilePicture || null;
      }
      if ('jobRole' in updates) {
        supabaseUpdates.job_role = updates.jobRole || null;
      }
      if ('jobPlace' in updates) {
        supabaseUpdates.job_place = updates.jobPlace || null;
      }
      if ('lookingFor' in updates) {
        supabaseUpdates.looking_for = updates.lookingFor || null;
      }
      
      // Standard field mappings
      const fieldMap: Record<string, string> = {
        age: 'age',
        race: 'race',
        gender: 'gender',
        job: 'job',
        university: 'university',
        yearsExperience: 'years_experience',
        hometown: 'hometown',
        location: 'location',
        smoking: 'smoking',
        drinking: 'drinking',
        drugs: 'drugs',
        nightOwl: 'night_owl',
        religion: 'religion',
        bio: 'bio',
        pets: 'pets',
      };
      
      Object.keys(updates).forEach(key => {
        if (key in fieldMap && !(key in supabaseUpdates)) {
          supabaseUpdates[fieldMap[key]] = (updates as any)[key] || null;
        }
      });

      // Only update Supabase if there are fields to update
      if (Object.keys(supabaseUpdates).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(supabaseUpdates)
          .eq('id', userId);

        if (error) {
          console.error('❌ Error updating user in Supabase:', error);
          console.error('❌ Failed fields:', Object.keys(supabaseUpdates));
          console.error('❌ Failed values:', supabaseUpdates);
          // Don't throw - continue with local update even if Supabase fails
        } else {
          console.log('✅ Successfully updated user in Supabase:', Object.keys(supabaseUpdates));
          console.log('✅ Updated values:', supabaseUpdates);
        }
      }
    } catch (error) {
      console.error('Error updating user in Supabase:', error);
      // Don't throw - continue with local update even if Supabase fails
    }
  };

  const getUserById = (userId: string): User | undefined => {
    return users.find(user => user.id === userId);
  };

  const getUsersByCategory = () => {
    const listers = users.filter(user => user.userType === 'homeowner');
    const searchers = users.filter(user => user.userType === 'searcher');
    
    return {
      listers,
      searchersRoommates: searchers.filter(user => user.lookingFor === 'roommates'),
      searchersHousing: searchers.filter(user => user.lookingFor === 'housing'),
      searchersBoth: searchers.filter(user => user.lookingFor === 'both'),
    };
  };

  const getConversation = (userId1: string, userId2: string): Conversation | undefined => {
    return conversations.find(
      conv =>
        conv.participants.includes(userId1) && conv.participants.includes(userId2)
    );
  };

  const getConversationsForUser = (userId: string): Conversation[] => {
    return conversations
      .filter(conv => conv.participants.includes(userId))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  };

  const sendMessage = async (senderId: string, receiverId: string, text: string, imageUrl?: string) => {
    // Ensure receiver user is in local users array (fetch from Supabase if needed)
    if (!getUserById(receiverId)) {
      console.log(`📥 [UserContext] Receiver user ${receiverId} not in local array, fetching from Supabase...`);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', receiverId)
          .single();

        if (!error && data) {
          // Parse space_type if it's a JSON string
          let spaceType: string | string[] | undefined = undefined;
          if (data.space_type) {
            try {
              const parsed = JSON.parse(data.space_type);
              spaceType = Array.isArray(parsed) ? parsed : data.space_type;
            } catch {
              spaceType = data.space_type;
            }
          }

          // Parse prompts if it's a JSON string
          let prompts: UserPrompt[] | undefined = undefined;
          if (data.prompts) {
            try {
              const parsed = JSON.parse(data.prompts);
              prompts = Array.isArray(parsed) ? parsed : undefined;
            } catch {
              prompts = undefined;
            }
          }

          // Convert Supabase user to app User format
          const receiverUser: User = {
            id: data.id,
            userType: data.user_type as 'homeowner' | 'searcher',
            lookingFor: data.looking_for as 'roommates' | 'housing' | 'both' | undefined,
            email: data.email,
            phone: data.phone,
            name: data.name,
            age: data.age || '',
            race: data.race || '',
            gender: data.gender || '',
            university: data.university || undefined,
            yearsExperience: data.years_experience || undefined,
            job: data.job || '',
            jobRole: data.job_role || undefined,
            jobPlace: data.job_place || undefined,
            profilePicture: data.profile_picture_url || null,
            hometown: data.hometown || '',
            location: data.location || '',
            pets: data.pets || undefined,
            smoking: data.smoking || '',
            drinking: data.drinking || '',
            drugs: data.drugs || '',
            nightOwl: data.night_owl || '',
            religion: data.religion || '',
            bio: data.bio || '',
            questions: data.questions || [],
            prompts: prompts,
            maxRoommates: data.max_roommates || undefined,
            roommateType: data.roommate_type || undefined,
            preferredCity: data.preferred_city || undefined,
            preferredLatitude: data.preferred_latitude || undefined,
            preferredLongitude: data.preferred_longitude || undefined,
            spaceType: spaceType,
            minBudget: data.min_budget ? Number(data.min_budget) : undefined,
            maxBudget: data.max_budget ? Number(data.max_budget) : undefined,
            leaseDuration: data.lease_duration || undefined,
            friendliness: data.friendliness !== null && data.friendliness !== undefined ? Number(data.friendliness) : undefined,
            cleanliness: data.cleanliness !== null && data.cleanliness !== undefined ? Number(data.cleanliness) : undefined,
            guestsAllowed: data.guests_allowed ? (data.guests_allowed as 'never' | 'with permission' | 'always okay') : undefined,
            createdAt: new Date(data.created_at).getTime(),
          };

          // Add receiver user to local users array
          setUsers(prevUsers => {
            if (!prevUsers.find(u => u.id === receiverId)) {
              const updated = [...prevUsers, receiverUser];
              AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated)).catch(err => {
                console.error('Error saving users to AsyncStorage:', err);
              });
              console.log(`✅ [UserContext] Added receiver user to local array: ${receiverUser.name}`);
              return updated;
            }
            return prevUsers;
          });
        } else {
          console.warn(`⚠️ [UserContext] Could not fetch receiver user ${receiverId} from Supabase:`, error);
        }
      } catch (error) {
        console.error(`❌ [UserContext] Error fetching receiver user from Supabase:`, error);
      }
    }

    const messageId = generateUUID();
    const message: Message = {
      id: messageId,
      senderId,
      receiverId,
      text,
      imageUrl,
      timestamp: Date.now(),
    };

    // Save message to Supabase FIRST (before creating conversation with foreign key)
    try {
      // Build message data - only include image_url if it exists (handle missing column gracefully)
      const messageData: {
        id: string;
        sender_id: string;
        receiver_id: string;
        text: string;
        created_at: string;
        image_url?: string;
      } = {
        id: messageId,
        sender_id: senderId,
        receiver_id: receiverId,
        text: text || '',
        created_at: new Date().toISOString(),
      };
      
      // Only add image_url if provided (column might not exist yet)
      if (imageUrl) {
        messageData.image_url = imageUrl;
      }
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageData);

      if (messageError) {
        console.error('Error saving message to Supabase:', messageError);
        // If it's a column error, try without image_url
        if (messageError.code === 'PGRST204' && imageUrl) {
          const { error: retryError } = await supabase
            .from('messages')
            .insert({
              id: messageId,
              sender_id: senderId,
              receiver_id: receiverId,
              text: text || '',
              created_at: new Date().toISOString(),
            });
          if (retryError) {
            console.error('Error saving message (retry without image_url):', retryError);
          }
        }
        // Continue with local storage even if Supabase fails
      }
    } catch (error) {
      console.error('Error saving message to Supabase:', error);
      // Continue with local storage even if Supabase fails
    }

    // Find or create conversation
    let conversation = getConversation(senderId, receiverId);
    let conversationId = conversation?.id;
    let isNewConversation = false;
    
    if (!conversation) {
      isNewConversation = true;
      conversationId = generateUUID();
      
      // Create conversation in Supabase (message now exists, so foreign key will work)
      // Use upsert to handle duplicate conversations gracefully
      try {
        const participant1 = senderId < receiverId ? senderId : receiverId;
        const participant2 = senderId < receiverId ? receiverId : senderId;
        
        // First, try to find existing conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(participant1_id.eq.${participant1},participant2_id.eq.${participant2}),and(participant1_id.eq.${participant2},participant2_id.eq.${participant1})`)
          .eq('is_group', false)
          .single();

        if (existingConv) {
          // Use existing conversation ID
          conversationId = existingConv.id;
          const { error: updateError } = await supabase
            .from('conversations')
            .update({
              last_message_id: messageId,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingConv.id);
          
          if (updateError) {
            console.error('Error updating conversation in Supabase:', updateError);
          }
        } else {
          // Create new conversation
          const { error: convError } = await supabase
            .from('conversations')
            .insert({
              id: conversationId,
              participant1_id: participant1,
              participant2_id: participant2,
              last_message_id: messageId,
              last_message_at: new Date().toISOString(),
              is_group: false,
              participants: [senderId, receiverId],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (convError) {
            console.error('Error creating conversation in Supabase:', convError);
            // Continue with local storage even if Supabase fails
          }
        }
      } catch (error) {
        console.error('Error creating conversation in Supabase:', error);
        // Continue with local storage even if Supabase fails
      }
      
      // Create conversation object with message already included
      conversation = {
        id: conversationId,
        participants: [senderId, receiverId],
        messages: [message], // Add message immediately
        updatedAt: Date.now(),
        isGroup: false,
        lastMessage: message,
      };
    } else {
      // Update existing conversation in Supabase
      try {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            last_message_id: messageId,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversationId);

        if (updateError) {
          console.error('Error updating conversation in Supabase:', updateError);
        }
      } catch (error) {
        console.error('Error updating conversation in Supabase:', error);
      }
      
      // Add message to existing conversation
      conversation = {
        ...conversation,
        messages: [...conversation.messages, message],
        lastMessage: message,
        updatedAt: Date.now(),
      };
    }

    // Update conversations array using functional update to ensure we have latest state
    setConversations(prevConversations => {
      if (isNewConversation) {
        // Add new conversation with message
        const updated = [...prevConversations, conversation];
        AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
        console.log('✅ New conversation created with message. Total conversations:', updated.length);
        return updated;
      } else {
        // Update existing conversation
        const updated = prevConversations.map(conv =>
          conv.id === conversationId ? conversation : conv
        );
        AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
        console.log('✅ Message added to existing conversation. Total conversations:', updated.length);
        return updated;
      }
    });
  };

  const deleteConversation = async (conversationId: string) => {
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(updatedConversations);
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updatedConversations));
  };

  const createGroupConversation = async (participantIds: string[], groupName: string): Promise<Conversation> => {
    // Validate participant count (max 6)
    if (participantIds.length > 6) {
      throw new Error('Group chats can have a maximum of 6 participants');
    }

    const groupConversation: Conversation = {
      id: generateUUID(),
      participants: participantIds,
      messages: [],
      updatedAt: Date.now(),
      isGroup: true,
      groupName: groupName,
    };
    const updatedConversations = [...conversations, groupConversation];
    setConversations(updatedConversations);
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updatedConversations));
    
    // Sync with Supabase
    try {
      await supabase.from('conversations').insert({
        id: groupConversation.id,
        is_group: true,
        group_name: groupName,
        participants: participantIds,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error syncing group conversation to Supabase:', error);
    }
    
    return groupConversation;
  };

  const addParticipantToGroup = async (conversationId: string, userId: string): Promise<boolean> => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || !conversation.isGroup) {
      return false; // Not a group conversation
    }

    if (conversation.participants.includes(userId)) {
      return false; // User already in conversation
    }

    if (conversation.participants.length >= 6) {
      return false; // Max participants reached
    }

    // Add participant locally
    const updatedParticipants = [...conversation.participants, userId];
    const updatedConversation = {
      ...conversation,
      participants: updatedParticipants,
      updatedAt: Date.now(),
    };
    const updatedConversations = conversations.map(c =>
      c.id === conversationId ? updatedConversation : c
    );
    setConversations(updatedConversations);
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updatedConversations));

    // Sync with Supabase
    try {
      const { error } = await supabase.rpc('add_participant_to_conversation', {
        conv_id: conversationId,
        user_id: userId,
      });
      if (error) {
        console.error('Error adding participant in Supabase:', error);
        // Fallback: manual update
        await supabase
          .from('conversations')
          .update({ participants: updatedParticipants, updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error syncing participant addition to Supabase:', error);
    }

    return true;
  };

  const removeParticipantFromGroup = async (conversationId: string, userId: string): Promise<boolean> => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || !conversation.isGroup) {
      return false; // Not a group conversation
    }

    if (!conversation.participants.includes(userId)) {
      return false; // User not in conversation
    }

    // Remove participant locally
    const updatedParticipants = conversation.participants.filter(id => id !== userId);
    const updatedConversation = {
      ...conversation,
      participants: updatedParticipants,
      updatedAt: Date.now(),
    };
    const updatedConversations = conversations.map(c =>
      c.id === conversationId ? updatedConversation : c
    );
    setConversations(updatedConversations);
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updatedConversations));

    // Sync with Supabase
    try {
      const { error } = await supabase.rpc('remove_participant_from_conversation', {
        conv_id: conversationId,
        user_id: userId,
      });
      if (error) {
        console.error('Error removing participant in Supabase:', error);
        // Fallback: manual update
        await supabase
          .from('conversations')
          .update({ participants: updatedParticipants, updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error syncing participant removal to Supabase:', error);
    }

    return true;
  };

  const deleteUser = async (userId: string) => {
    // Remove user from local state
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    
    // Remove conversations involving this user
    const updatedConversations = conversations.filter(
      conv => !conv.participants.includes(userId)
    );
    setConversations(updatedConversations);
    
    // Clear current user if it's the deleted user
    if (currentUser?.id === userId) {
      setCurrentUserState(null);
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    
    // Update storage
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updatedConversations));
    
    // TODO: Delete from Supabase
    // await supabase.from('users').delete().eq('id', userId);
    // await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    // await supabase.from('conversations').delete().contains('participants', [userId]);
    // await supabase.from('swipes').delete().or(`swiper_id.eq.${userId},swiped_id.eq.${userId}`);
    // await supabase.from('matches').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  };

  const addLikedListing = async (listingId: string) => {
    if (!likedListings.includes(listingId)) {
      const updated = [...likedListings, listingId];
      setLikedListings(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.LIKED_LISTINGS, JSON.stringify(updated));
    }
  };

  const removeLikedListing = async (listingId: string) => {
    const updated = likedListings.filter(id => id !== listingId);
    setLikedListings(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.LIKED_LISTINGS, JSON.stringify(updated));
  };

  const isListingLiked = (listingId: string): boolean => {
    return likedListings.includes(listingId);
  };

  const convertUserAccountType = async (userId: string, newLookingFor: 'both') => {
    // Update in Supabase
    try {
      const { error } = await supabase
        .from('users')
        .update({ looking_for: newLookingFor })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user account type in Supabase:', error);
      }
    } catch (error) {
      console.error('Error updating user account type in Supabase:', error);
    }

    // Update local state
    await updateUser(userId, { lookingFor: newLookingFor });
    
    // Update current user if it's the one being updated
    if (currentUser?.id === userId) {
      const updatedCurrentUser = { ...currentUser, lookingFor: newLookingFor };
      await setCurrentUser(updatedCurrentUser);
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        conversations,
        likedListings,
        isLoaded,
        setCurrentUser,
        addUser,
        updateUser,
        getUserById,
        getUsersByCategory,
        sendMessage,
        getConversation,
        getConversationsForUser,
        deleteConversation,
        createGroupConversation,
        addParticipantToGroup,
        removeParticipantFromGroup,
        deleteUser,
        addLikedListing,
        removeLikedListing,
        isListingLiked,
        syncUserFromSupabase,
        convertUserAccountType,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

