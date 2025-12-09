import React, { useEffect } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();

  useEffect(() => {
    // GIF duration - adjust this based on your actual GIF length
    // You can check your GIF duration and update this value
    const GIF_DURATION = 3000; // 3 seconds - adjust to match your GIF's actual duration
    const LAST_FRAME_DURATION = 1000; // 0.4 seconds on last frame
    
    // After GIF finishes playing, wait 0.4 seconds on last frame, then navigate
    const totalDuration = GIF_DURATION + LAST_FRAME_DURATION;
    
    const timer = setTimeout(() => {
      navigation.replace('Introduction');
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.gifContainer}>
        <Image
          source={require('../assets/splash-animation.gif')}
          style={styles.gif}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gif: {
    width: '100%',
    height: '100%',
  },
});

