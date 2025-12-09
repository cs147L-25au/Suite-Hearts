import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserType, LookingFor, Message, Conversation } from '../types';

interface UserContextType {
  currentUser: User | null;
  users: User[];
  conversations: Conversation[];
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
  deleteUser: (userId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: '@suite_hearts:users',
  CURRENT_USER: '@suite_hearts:current_user',
  CONVERSATIONS: '@suite_hearts:conversations',
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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
      const [usersData, currentUserData, conversationsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
        AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS),
      ]);

      if (usersData) {
        setUsers(JSON.parse(usersData));
      }
      if (currentUserData) {
        setCurrentUserState(JSON.parse(currentUserData));
      }
      if (conversationsData) {
        setConversations(JSON.parse(conversationsData));
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
    const updatedUsers = users.map(user =>
      user.id === userId ? { ...user, ...updates } : user
    );
    setUsers(updatedUsers);
    
    // Update current user if it's the one being updated
    if (currentUser?.id === userId) {
      setCurrentUserState({ ...currentUser, ...updates });
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
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
    const message: Message = {
      id: `${Date.now()}-${Math.random()}`,
      senderId,
      receiverId,
      text,
      imageUrl,
      timestamp: Date.now(),
    };

    // Find or create conversation
    let conversation = getConversation(senderId, receiverId);
    
    if (!conversation) {
      conversation = {
        id: `${Date.now()}-${Math.random()}`,
        participants: [senderId, receiverId],
        messages: [],
        updatedAt: Date.now(),
      };
      const updatedConversations = [...conversations, conversation];
      setConversations(updatedConversations);
    }

    // Add message to conversation
    const updatedMessages = [...conversation.messages, message];
    const updatedConversation = {
      ...conversation,
      messages: updatedMessages,
      lastMessage: message,
      updatedAt: Date.now(),
    };

    const updatedConversations = conversations.map(conv =>
      conv.id === conversation!.id ? updatedConversation : conv
    );
    
    setConversations(updatedConversations);
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updatedConversations));
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

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        conversations,
        setCurrentUser,
        addUser,
        updateUser,
        getUserById,
        getUsersByCategory,
        sendMessage,
        getConversation,
        getConversationsForUser,
        deleteUser,
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

