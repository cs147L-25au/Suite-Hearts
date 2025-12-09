import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { User, Listing } from '../types';
import RoommateCard from '../components/RoommateCard';
import ListingCard from '../components/ListingCard';

const Tab = createMaterialTopTabNavigator();
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SwipeScreen() {
  const { currentUser, users } = useUser();
  const [roommates, setRoommates] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    // Filter users based on what current user is looking for
    if (currentUser.userType === 'searcher') {
      // Get roommates (other searchers looking for roommates)
      const roommateUsers = users.filter(
        (user) =>
          user.id !== currentUser.id &&
          user.userType === 'searcher' &&
          (user.lookingFor === 'roommates' || user.lookingFor === 'both')
      );
      setRoommates(roommateUsers);

      // Get listings (from homeowners)
      // TODO: Fetch from Supabase when listings are implemented
      setListings([]);
    }
  }, [currentUser, users]);

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>Please sign up first</Text>
      </View>
    );
  }

  // Determine which tabs to show based on what user is looking for
  const showRoommatesTab = currentUser.userType === 'searcher' && 
    (currentUser.lookingFor === 'roommates' || currentUser.lookingFor === 'both');
  const showHousesTab = currentUser.userType === 'searcher' && 
    (currentUser.lookingFor === 'housing' || currentUser.lookingFor === 'both');

  // If user is a homeowner, they shouldn't see swipe screen
  if (currentUser.userType === 'homeowner') {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>Swipe feature is for searchers only</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#FF6B35',
          tabBarInactiveTintColor: '#A68B7B',
          tabBarIndicatorStyle: { backgroundColor: '#FF6B35' },
          tabBarStyle: { backgroundColor: '#FFF5E1' },
          tabBarLabelStyle: { fontSize: 16, fontWeight: '600' },
        }}
      >
        {showRoommatesTab && (
          <Tab.Screen name="Roommates">
            {() => <RoommatesTab roommates={roommates} />}
          </Tab.Screen>
        )}
        {showHousesTab && (
          <Tab.Screen name="Houses">
            {() => <HousesTab listings={listings} />}
          </Tab.Screen>
        )}
      </Tab.Navigator>
    </View>
  );
}

function RoommatesTab({ roommates }: { roommates: User[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedUsers, setSwipedUsers] = useState<Set<string>>(new Set());

  if (roommates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#E8D5C4" />
        <Text style={styles.emptyText}>No roommates found</Text>
        <Text style={styles.emptySubtext}>Check back later for new matches!</Text>
      </View>
    );
  }

  const currentRoommate = roommates[currentIndex];
  if (!currentRoommate) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#FF6B35" />
        <Text style={styles.emptyText}>You've seen everyone!</Text>
        <Text style={styles.emptySubtext}>Check back later for new matches</Text>
      </View>
    );
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    // TODO: Save swipe action to Supabase
    setSwipedUsers(new Set([...swipedUsers, currentRoommate.id]));
    
    if (currentIndex < roommates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <View style={styles.swipeContainer}>
      <RoommateCard
        user={currentRoommate}
        onSwipeLeft={() => handleSwipe('left')}
        onSwipeRight={() => handleSwipe('right')}
      />
    </View>
  );
}

function HousesTab({ listings }: { listings: Listing[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedListings, setSwipedListings] = useState<Set<string>>(new Set());

  if (listings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="home-outline" size={64} color="#E8D5C4" />
        <Text style={styles.emptyText}>No listings found</Text>
        <Text style={styles.emptySubtext}>Check back later for new properties!</Text>
      </View>
    );
  }

  const currentListing = listings[currentIndex];
  if (!currentListing) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#FF6B35" />
        <Text style={styles.emptyText}>You've seen all listings!</Text>
        <Text style={styles.emptySubtext}>Check back later for new properties</Text>
      </View>
    );
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    // TODO: Save swipe action to Supabase
    setSwipedListings(new Set([...swipedListings, currentListing.id]));
    
    if (currentIndex < listings.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <View style={styles.swipeContainer}>
      <ListingCard
        listing={currentListing}
        onSwipeLeft={() => handleSwipe('left')}
        onSwipeRight={() => handleSwipe('right')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  swipeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
  },
  noUserText: {
    fontSize: 18,
    color: '#6F4E37',
    textAlign: 'center',
    marginTop: 100,
  },
});

