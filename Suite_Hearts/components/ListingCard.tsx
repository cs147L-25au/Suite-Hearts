import React, { useRef } from 'react';
import { StyleSheet, View, Text, Image, Animated, PanResponder, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Listing } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Props {
  listing: Listing;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function ListingCard({ listing, onSwipeLeft, onSwipeRight }: Props) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        rotate.setValue(gestureState.dx / 10);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: gestureState.dx > 0 ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100, y: gestureState.dy },
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(rotate, {
              toValue: gestureState.dx > 0 ? 1 : -1,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start(() => {
            if (gestureState.dx > 0) {
              onSwipeRight();
            } else {
              onSwipeLeft();
            }
            pan.setValue({ x: 0, y: 0 });
            rotate.setValue(0);
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
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
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
      {...panResponder.panHandlers}
    >
      {/* Like/Nope Overlays */}
      <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
        <Text style={styles.overlayText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }]}>
        <Text style={styles.overlayText}>NOPE</Text>
      </Animated.View>

      {/* Photo */}
      <View style={styles.photoContainer}>
        {listing.photos && listing.photos.length > 0 ? (
          <Image source={{ uri: listing.photos[0] }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="home" size={120} color="#E8D5C4" />
            <Text style={styles.photoPlaceholderText}>No photo available</Text>
          </View>
        )}
      </View>

      {/* Info Section - Scrollable */}
      <ScrollView style={styles.infoContainer} showsVerticalScrollIndicator={false}>
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

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={onSwipeLeft}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={() => {
              // TODO: Navigate to message screen with owner
            }}
          >
            <Ionicons name="mail" size={24} color="#6F4E37" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={onSwipeRight}
          >
            <Ionicons name="heart" size={32} color="#FFFFFF" />
          </TouchableOpacity>
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
  photoPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#A68B7B',
  },
  infoContainer: {
    flex: 1,
    padding: 20,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 20,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passButton: {
    backgroundColor: '#F44336',
  },
  messageButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  likeButton: {
    backgroundColor: '#4CAF50',
  },
});

