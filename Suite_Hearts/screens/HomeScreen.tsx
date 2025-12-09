import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from './ProfileScreen';
import ChatScreen from './ChatScreen';
import MapScreen from './MapScreen';
import SwipeScreen from './SwipeScreen';

const Tab = createBottomTabNavigator();

function SearchScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text>Search Screen</Text>
    </View>
  );
}

// MapScreen, SwipeScreen, ChatScreen and ProfileScreen are now imported from separate files

export default function HomeScreen() {
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
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});