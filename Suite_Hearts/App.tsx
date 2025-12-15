import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { UserProvider } from './context/UserContext';
import { PropertyProvider } from './context/PropertyContext';
import SplashScreen from './screens/SplashScreen';
import IntroductionScreen from './screens/IntroductionScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import ConversationScreen from './screens/ConversationScreen';
import ListingDetailScreen from './screens/ListingDetailScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <UserProvider>
      <PropertyProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Introduction" component={IntroductionScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PropertyProvider>
    </UserProvider>
  );
}
