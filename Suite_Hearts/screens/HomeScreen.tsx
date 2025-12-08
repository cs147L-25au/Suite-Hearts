import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

function SearchScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text>Search Screen</Text>
    </View>
  );
}

function MapScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text>Map Screen</Text>
    </View>
  );
}

function SwipeScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text>Swipe Screen</Text>
    </View>
  );
}

function ChatScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text>Chat Screen</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text>Profile Screen</Text>
    </View>
  );
}

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
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
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