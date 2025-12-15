import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Image, Animated, PanResponder, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Props {
  user: User;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  onSwipeTrigger?: (triggerFn: (direction: 'left' | 'right') => void) => void;
  onPromptPress?: (prompt: { id: string; promptText: string; answer: string }) => void;
}

export default function RoommateCard({ user, onSwipeLeft, onSwipeRight, isExpanded = false, onExpand, onSwipeTrigger, onPromptPress }: Props) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const swipeTriggered = useRef(false);

  // Expose swipe function via callback
  const triggerSwipe = useCallback((direction: 'left' | 'right') => {
    if (swipeTriggered.current || isExpanded) return;
    swipeTriggered.current = true;
    
    const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    const targetRotate = direction === 'right' ? 15 : -15;
    
    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: targetX, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotate, {
        toValue: targetRotate,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (direction === 'right') {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
      pan.setValue({ x: 0, y: 0 });
      rotate.setValue(0);
      swipeTriggered.current = false;
    });
  }, [isExpanded, onSwipeLeft, onSwipeRight]);

  // Expose triggerSwipe to parent
  useEffect(() => {
    if (onSwipeTrigger) {
      onSwipeTrigger(triggerSwipe);
    }
  }, [onSwipeTrigger, triggerSwipe]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isExpanded) return false;
        // Only respond to horizontal swipes, allow vertical scrolling and taps
        // Require significant horizontal movement to start swipe
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only handle horizontal movement for swiping
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          pan.setValue({ x: gestureState.dx, y: 0 });
          rotate.setValue(gestureState.dx / 20); // Adjusted for new range
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (swipeTriggered.current) return;
        
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          // Swipe detected - complete fling animation
          swipeTriggered.current = true;
          const direction = gestureState.dx > 0 ? 'right' : 'left';
          const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
          const targetRotate = direction === 'right' ? 30 : -30;
          
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: targetX, y: gestureState.dy * 0.5 },
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(rotate, {
              toValue: targetRotate,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start(() => {
            if (direction === 'right') {
              onSwipeRight();
            } else {
              onSwipeLeft();
            }
            pan.setValue({ x: 0, y: 0 });
            rotate.setValue(0);
            swipeTriggered.current = false;
          });
        } else {
          // Return to center
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }),
            Animated.spring(rotate, {
              toValue: 0,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-30, 0, 30],
    outputRange: ['-30deg', '0deg', '30deg'],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: rotateInterpolate },
          ],
        },
      ]}
      {...(!isExpanded ? panResponder.panHandlers : {})}
    >
      {!isExpanded && onExpand && (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => {
            onExpand();
          }}
          style={StyleSheet.absoluteFill}
          delayPressIn={0}
        />
      )}
      {/* Like/Nope Overlays */}
      <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
        <Text style={styles.overlayText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }]}>
        <Text style={styles.overlayText}>NOPE</Text>
      </Animated.View>

      {/* Photo */}
      <View style={styles.photoContainer}>
        {user.profilePicture ? (
          <Image source={{ uri: user.profilePicture }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={120} color="#E8D5C4" />
          </View>
        )}
      </View>

      {/* Info Section - Scrollable */}
      <ScrollView 
        style={styles.infoContainer} 
        contentContainerStyle={styles.infoContentContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
        <View style={styles.header}>
          <Text style={styles.nameAge}>
            {user.name}{user.age ? `, ${user.age}` : ''}
          </Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="briefcase" size={20} color="#6F4E37" />
            <Text style={styles.detailText}>{user.job}</Text>
          </View>
          {user.university && user.university !== 'N/A' && (
            <View style={styles.detailRow}>
              <Ionicons name="school" size={20} color="#6F4E37" />
              <Text style={styles.detailText}>{user.university}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color="#6F4E37" />
            <Text style={styles.detailText}>{user.location}</Text>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.bioLabel}>About</Text>
          <Text style={styles.bio}>{user.bio}</Text>
        </View>

        {/* Prompts Section */}
        {user.prompts && user.prompts.length > 0 && (
          <View style={styles.promptsSection}>
            {user.prompts.map((prompt, index) => (
              <TouchableOpacity 
                key={prompt.id} 
                style={styles.promptCard}
                onPress={() => onPromptPress && onPromptPress(prompt)}
                activeOpacity={0.7}
              >
                <Text style={styles.promptQuestion}>{prompt.promptText}</Text>
                <Text style={styles.promptAnswer}>{prompt.answer}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.preferences}>
          <Text style={styles.preferencesLabel}>Preferences</Text>
          <View style={styles.preferencesGrid}>
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Smoking</Text>
              <Text style={styles.preferenceValue}>{user.smoking}</Text>
            </View>
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Drinking</Text>
              <Text style={styles.preferenceValue}>{user.drinking}</Text>
            </View>
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Pets</Text>
              <Text style={styles.preferenceValue}>{user.pets || 'N/A'}</Text>
            </View>
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Sleep Schedule</Text>
              <Text style={styles.preferenceValue}>{user.nightOwl}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 40,
    height: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    borderWidth: 4,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeOverlay: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  nopeOverlay: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  overlayText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  photoContainer: {
    width: '100%',
    height: '60%',
    backgroundColor: '#E8D5C4',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8D5C4',
  },
  infoContainer: {
    flex: 1,
    padding: 20,
  },
  infoContentContainer: {
    paddingBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  nameAge: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6F4E37',
  },
  details: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#6F4E37',
  },
  bioSection: {
    marginBottom: 20,
  },
  bioLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#6F4E37',
    lineHeight: 24,
  },
  promptsSection: {
    marginBottom: 20,
    gap: 12,
  },
  promptCard: {
    backgroundColor: '#FFF5E1',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
  },
  promptAnswer: {
    fontSize: 16,
    color: '#6F4E37',
    lineHeight: 22,
  },
  preferences: {
    marginBottom: 20,
  },
  preferencesLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 12,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  preferenceItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  preferenceLabel: {
    fontSize: 12,
    color: '#A68B7B',
    marginBottom: 4,
  },
  preferenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F4E37',
  },
});

