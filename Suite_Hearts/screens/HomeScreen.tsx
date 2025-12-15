import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from './ProfileScreen';
import ChatScreen from './ChatScreen';
import MapScreen from './MapScreen';
import SwipeScreen from './SwipeScreen';
import ManageListingsScreen from './ManageListingsScreen';
import PropertyListScreen from './PropertyListScreen';
import ListingDetailScreen from './ListingDetailScreen';
import { useUser } from '../context/UserContext';
import { useProperties } from '../context/PropertyContext';
import { Property } from '../lib/datafiniti';
import HousingPromptScreen from '../components/HousingPromptScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function SearchStack() {
  const { setSelectedPropertyId } = useProperties();
  
  // Handle property selection from list to center map
  const handlePropertySelect = (property: Property) => {
    setSelectedPropertyId(property.id);
  };

  return (
    <HousingPromptScreen screenName="Search">
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PropertyList">
          {() => <PropertyListScreen onPropertySelect={handlePropertySelect} />}
        </Stack.Screen>
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      </Stack.Navigator>
    </HousingPromptScreen>
  );
}

function MapStack() {
  return (
    <HousingPromptScreen screenName="Map">
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      </Stack.Navigator>
    </HousingPromptScreen>
  );
}

// MapScreen, SwipeScreen, ChatScreen and ProfileScreen are now imported from separate files

export default function HomeScreen() {
  const { currentUser, isLoaded } = useUser();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isHomeowner = currentUser?.userType === 'homeowner';

  // Redirect to Introduction if not logged in
  React.useEffect(() => {
    if (isLoaded && !currentUser) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Introduction' }],
      });
    }
  }, [currentUser, isLoaded, navigation]);

  // Show nothing while loading or if no user
  if (!isLoaded || !currentUser) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'search'; // Default value

          if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'Map') {
            iconName = 'map';
          } else if (route.name === 'Swipe') {
            iconName = 'heart';
          } else if (route.name === 'Listings') {
            iconName = 'home';
          } else if (route.name === 'Chat') {
            iconName = 'chatbubble';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B35', // Orange
        tabBarInactiveTintColor: '#A68B7B', // Muted espresso
        tabBarStyle: {
          backgroundColor: '#FFF5E1', // Beige
          borderTopColor: '#E8D5C4', // Light beige
        },
      })}
    >
      {/* Show Search and Map tabs for all users (prompts will show for roommate-only) */}
      <Tab.Screen 
        name="Search" 
        component={SearchStack}
        options={{ title: 'Listing Search' }}
      />
      <Tab.Screen name="Map" component={MapStack} />
      {isHomeowner ? (
        <Tab.Screen 
          name="Listings" 
          component={ManageListingsScreen}
          options={{ title: 'My Listings' }}
        />
      ) : (
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      )}
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
  },
});