import React, { useRef, useEffect, useCallback, useState } from 'react';
import { StyleSheet, View, Text, Image, Animated, PanResponder, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Listing } from '../types';
import { getRandomRealEstatePhotos } from '../lib/photoUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Props {
  listing: Listing;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  onSwipeTrigger?: (triggerFn: (direction: 'left' | 'right') => void) => void;
}

export default function ListingCard({ listing, onSwipeLeft, onSwipeRight, isExpanded = false, onExpand, onSwipeTrigger }: Props) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const swipeTriggered = useRef(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photoPan = useRef(new Animated.ValueXY()).current;
  const photoSwipeTriggered = useRef(false);

  // Get photos: user-uploaded photos take priority, otherwise use random photos
  // External listings (no ownerId) only get ONE photo
  const isExternalListing = !listing.ownerId || listing.ownerId === '';
  const maxPhotos = isExternalListing ? 1 : 4;
  const photos = listing.photos && listing.photos.length > 0 
    ? listing.photos.slice(0, maxPhotos) // Max 4 photos for user listings, 1 for external
    : getRandomRealEstatePhotos(listing.id, 1); // At least 1 random photo

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

  // Photo swipe responder (for swiping through photos)
  const photoPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes on photo area
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10 && photos.length > 1;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (photos.length > 1) {
          photoPan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (photoSwipeTriggered.current || photos.length <= 1) return;
        
        const threshold = SCREEN_WIDTH * 0.2;
        if (Math.abs(gestureState.dx) > threshold) {
          photoSwipeTriggered.current = true;
          const direction = gestureState.dx > 0 ? 'left' : 'right';
          
          if (direction === 'left' && currentPhotoIndex > 0) {
            // Swipe left = go to previous photo
            setCurrentPhotoIndex(currentPhotoIndex - 1);
          } else if (direction === 'right' && currentPhotoIndex < photos.length - 1) {
            // Swipe right = go to next photo
            setCurrentPhotoIndex(currentPhotoIndex + 1);
          }
          
          Animated.spring(photoPan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start(() => {
            photoSwipeTriggered.current = false;
          });
        } else {
          // Return to center
          Animated.spring(photoPan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Card swipe responder (for swiping left/right on the card)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isExpanded) return false;
        // Only respond to horizontal swipes, allow vertical scrolling and taps
        // Require significant horizontal movement to start swipe
        // Don't respond if user is swiping photos
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

      {/* Photo Gallery with Swipe Support */}
      <View style={styles.photoContainer}>
        {photos.length > 0 ? (
          <Animated.View
            style={[
              styles.photoGallery,
              {
                transform: [{ translateX: photoPan.x }],
              },
            ]}
            {...photoPanResponder.panHandlers}
          >
            {photos.map((photo, index) => (
              <Image
                key={index}
                source={typeof photo === 'string' ? { uri: photo } : photo}
                style={[
                  styles.photo,
                  { display: index === currentPhotoIndex ? 'flex' : 'none' },
                ]}
                resizeMode="cover"
              />
            ))}
            {/* Photo Indicators */}
            {photos.length > 1 && (
              <View style={styles.photoIndicators}>
                {photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.photoIndicator,
                      index === currentPhotoIndex && styles.photoIndicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="home" size={120} color="#E8D5C4" />
            <Text style={styles.photoPlaceholderText}>No photo available</Text>
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
          <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
        </View>

        <View style={styles.addressSection}>
          <Text style={styles.address}>{listing.address}</Text>
          <Text style={styles.cityState}>
            {listing.city}, {listing.state} {listing.zipCode}
          </Text>
        </View>

        {listing.bedrooms && listing.bathrooms && (
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="bed" size={20} color="#6F4E37" />
              <Text style={styles.detailText}>{listing.bedrooms} bed</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="water" size={20} color="#6F4E37" />
              <Text style={styles.detailText}>{listing.bathrooms} bath</Text>
            </View>
            {listing.squareFeet && (
              <View style={styles.detailItem}>
                <Ionicons name="square" size={20} color="#6F4E37" />
                <Text style={styles.detailText}>{listing.squareFeet} sq ft</Text>
              </View>
            )}
          </View>
        )}

        {listing.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>
        )}

        {listing.availableDate && (
          <View style={styles.availableSection}>
            <Ionicons name="calendar" size={20} color="#6F4E37" />
            <Text style={styles.availableText}>
              Available: {new Date(listing.availableDate).toLocaleDateString()}
            </Text>
          </View>
        )}
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
    position: 'relative',
    overflow: 'hidden',
  },
  photoGallery: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
  },
  photo: {
    width: SCREEN_WIDTH - 40,
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  photoIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoIndicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8D5C4',
  },
  photoPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#A68B7B',
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
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6F4E37',
  },
  addressSection: {
    marginBottom: 16,
  },
  address: {
    fontSize: 22,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 4,
  },
  cityState: {
    fontSize: 18,
    color: '#A68B7B',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6F4E37',
    lineHeight: 24,
  },
  availableSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  availableText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
  },
});

