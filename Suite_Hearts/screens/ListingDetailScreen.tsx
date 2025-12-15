import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Dimensions, Alert, Platform, StatusBar } from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, RootStackParamList, Listing } from '../types';
import { Property } from '../lib/datafiniti';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;

type ListingDetailRouteProp = RouteProp<HomeStackParamList, 'ListingDetail'>;
type ListingDetailNavigationProp = NavigationProp<RootStackParamList>;

type ListingDetail = (Property & { source: 'external' }) | (Listing & { source: 'user' });

export default function ListingDetailScreen() {
  const navigation = useNavigation<ListingDetailNavigationProp>();
  const route = useRoute<ListingDetailRouteProp>();
  const { listingId, listing } = route.params;
  const { currentUser, getUserById, sendMessage } = useUser();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [owner, setOwner] = useState<User | null>(null);
  const [listingData, setListingData] = useState<ListingDetail | null>(null);

  useEffect(() => {
    if (listing) {
      setListingData(listing);
      if (listing.source === 'user') {
        // Fetch owner info
        const ownerData = getUserById(listing.ownerId);
        if (ownerData) {
          setOwner(ownerData);
        } else {
          // Fetch from Supabase if not in local storage
          fetchOwnerFromSupabase(listing.ownerId);
        }
      }
    } else if (listingId) {
      // Fetch listing from Supabase or external source
      fetchListing(listingId);
    }
  }, [listing, listingId]);

  const fetchListing = async (id: string) => {
    try {
      // Try to fetch from user listings first
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (data && !error) {
        const listing: Listing = {
          id: data.id,
          ownerId: data.owner_id,
          title: data.title || '',
          description: data.description || '',
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zip_code || '',
          price: data.price || 0,
          latitude: data.latitude,
          longitude: data.longitude,
          photos: [], // Will fetch separately
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          squareFeet: data.square_feet,
          availableDate: data.available_date,
          createdAt: new Date(data.created_at).getTime(),
          updatedAt: new Date(data.updated_at).getTime(),
        };
        setListingData({ ...listing, source: 'user' });
        fetchOwnerFromSupabase(data.owner_id);
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
    }
  };

  const fetchOwnerFromSupabase = async (ownerId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, profile_picture_url, email, phone')
        .eq('id', ownerId)
        .single();

      if (data && !error) {
        setOwner({
          id: data.id,
          name: data.name,
          profilePicture: data.profile_picture_url,
          email: data.email,
          phone: data.phone,
        });
      }
    } catch (error) {
      console.error('Error fetching owner:', error);
    }
  };

  const getPhotos = (): string[] => {
    if (!listingData) return [];
    if (listingData.source === 'user' && listingData.photos && listingData.photos.length > 0) {
      return listingData.photos;
    }
    return []; // Datafiniti properties don't have photos yet
  };

  const handlePreviousPhoto = () => {
    const photos = getPhotos();
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    }
  };

  const handleNextPhoto = () => {
    const photos = getPhotos();
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  };

  const handleMessageOwner = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to message the owner.');
      return;
    }

    if (listingData?.source === 'user' && owner) {
      // Navigate to conversation with owner (don't auto-send message)
      (navigation as any).navigate('Conversation', {
        userId: owner.id,
        userName: owner.name,
      });
    }
    // For Datafiniti properties, the button won't be shown (handled in UI)
  };

  if (!listingData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const photos = getPhotos();
  const beds = listingData.source === 'user' ? listingData.bedrooms : listingData.numBedrooms;
  const baths = listingData.source === 'user' ? listingData.bathrooms : listingData.numBathrooms;

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#6F4E37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listing Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery */}
        <View style={styles.photoContainer}>
          {photos.length > 0 ? (
            <>
              <Image
                source={{ uri: photos[currentPhotoIndex] }}
                style={styles.photo}
                resizeMode="cover"
              />
              {photos.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.photoNavButton, styles.photoNavButtonLeft]}
                    onPress={handlePreviousPhoto}
                  >
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoNavButton, styles.photoNavButtonRight]}
                    onPress={handleNextPhoto}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.photoIndicator}>
                    <Text style={styles.photoIndicatorText}>
                      {currentPhotoIndex + 1} / {photos.length}
                    </Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="home" size={64} color="#E8D5C4" />
              <Text style={styles.photoPlaceholderText}>No photo available</Text>
            </View>
          )}
        </View>

        {/* Header Info */}
        <View style={styles.header}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${listingData.price.toLocaleString()}/mo</Text>
            {(beds || baths) && (
              <View style={styles.bedBathRow}>
                {beds && <Text style={styles.bedBathText}>{beds} bed{beds > 1 ? 's' : ''}</Text>}
                {beds && baths && <Text style={styles.bedBathSeparator}> • </Text>}
                {baths && <Text style={styles.bedBathText}>{baths} bath{baths > 1 ? 's' : ''}</Text>}
              </View>
            )}
          </View>
          <Text style={styles.address}>{listingData.address}</Text>
          <Text style={styles.cityState}>
            {listingData.city}, {listingData.state}
            {listingData.source === 'user' && listingData.zipCode && ` ${listingData.zipCode}`}
          </Text>
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          <View style={styles.detailsGrid}>
            {listingData.source === 'user' && listingData.squareFeet && (
              <View style={styles.detailItem}>
                <Ionicons name="square-outline" size={20} color="#6F4E37" />
                <Text style={styles.detailLabel}>Square Feet</Text>
                <Text style={styles.detailValue}>{listingData.squareFeet.toLocaleString()} sq ft</Text>
              </View>
            )}
            {listingData.source === 'user' && listingData.availableDate && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={20} color="#6F4E37" />
                <Text style={styles.detailLabel}>Available</Text>
                <Text style={styles.detailValue}>{new Date(listingData.availableDate).toLocaleDateString()}</Text>
              </View>
            )}
            {/* Add more property details from Datafiniti if available */}
            <View style={styles.detailItem}>
              <Ionicons name="home-outline" size={20} color="#6F4E37" />
              <Text style={styles.detailLabel}>Property Type</Text>
              <Text style={styles.detailValue}>Rental</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {listingData.source === 'user' && listingData.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Place</Text>
            <Text style={styles.description}>{listingData.description}</Text>
          </View>
        )}

        {/* Amenities Section (for future external listing integration) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {/* These would come from external listing API in the future */}
            <View style={styles.amenityItem}>
              <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
              <Text style={styles.amenityText}>Pet Friendly</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
              <Text style={styles.amenityText}>Washer/Dryer</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
              <Text style={styles.amenityText}>Parking Available</Text>
            </View>
          </View>
        </View>

        {/* Contact Card */}
        <View style={styles.contactCard}>
          {listingData.source === 'user' && owner ? (
            <>
              <View style={styles.contactHeader}>
                {owner.profilePicture ? (
                  <Image source={{ uri: owner.profilePicture }} style={styles.ownerAvatar} />
                ) : (
                  <View style={styles.ownerAvatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#A68B7B" />
                  </View>
                )}
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>{owner.name}</Text>
                  <Text style={styles.ownerLabel}>Listed by user</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.messageButton} onPress={handleMessageOwner}>
                <Ionicons name="mail" size={20} color="#FFF5E1" />
                <Text style={styles.messageButtonText}>Message Owner</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.externalListingMessage}>
              <Ionicons name="information-circle" size={24} color="#FF6B35" />
              <Text style={styles.externalListingText}>
                This property is listed externally. Please contact outside of the app.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  scrollView: {
    flex: 1,
  },
  photoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#E8D5C4',
    position: 'relative',
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
  photoNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  photoNavButtonLeft: {
    left: 12,
  },
  photoNavButtonRight: {
    right: 12,
  },
  photoIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 5,
  },
  photoIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF5E1',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
  },
  headerSpacer: {
    width: 40,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6F4E37',
  },
  bedBathRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bedBathText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
  },
  bedBathSeparator: {
    fontSize: 16,
    color: '#A68B7B',
    marginHorizontal: 4,
  },
  address: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 4,
  },
  cityState: {
    fontSize: 16,
    color: '#A68B7B',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6F4E37',
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 16,
    color: '#6F4E37',
    flex: 1,
  },
  description: {
    fontSize: 16,
    color: '#6F4E37',
    lineHeight: 24,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
  },
  amenityText: {
    fontSize: 16,
    color: '#6F4E37',
  },
  contactCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  ownerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  ownerAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8D5C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 4,
  },
  ownerLabel: {
    fontSize: 14,
    color: '#A68B7B',
  },
  messageButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  messageButtonText: {
    color: '#FFF5E1',
    fontSize: 16,
    fontWeight: '600',
  },
  externalListingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  externalListingText: {
    flex: 1,
    fontSize: 16,
    color: '#6F4E37',
    lineHeight: 22,
  },
});

