import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useProperties } from '../context/PropertyContext';
import { useUser } from '../context/UserContext';
import { Property } from '../lib/datafiniti';
import { Listing, HomeStackParamList } from '../types';
import { supabase } from '../lib/supabase';

type PropertyListNavigationProp = StackNavigationProp<HomeStackParamList>;

interface PropertyListScreenProps {
  onPropertySelect?: (property: Property) => void;
}

export default function PropertyListScreen({ onPropertySelect }: PropertyListScreenProps) {
  const navigation = useNavigation<PropertyListNavigationProp>();
  const { properties: datafinitiProperties, loading, error, selectedPropertyId, setSelectedPropertyId } = useProperties();
  const { currentUser, likedListings, isListingLiked } = useUser();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [allUserListings, setAllUserListings] = useState<Listing[]>([]);
  const [showLikedListings, setShowLikedListings] = useState(false);

  // Fetch ALL user-created listings (not just current user's)
  useEffect(() => {
    const fetchAllListings = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching listings:', error);
          return;
        }

        if (data) {
          // Fetch photos for all listings
          const listings: Listing[] = await Promise.all(
            data.map(async (item: any) => {
              // Fetch photos for this listing
              const { data: photosData } = await supabase
                .from('listing_photos')
                .select('photo_url')
                .eq('listing_id', item.id)
                .order('photo_order', { ascending: true });

              return {
                id: item.id,
                ownerId: item.owner_id,
                title: item.title || '',
                description: item.description || '',
                address: item.address,
                city: item.city,
                state: item.state,
                zipCode: item.zip_code || '',
                price: item.price || 0,
                latitude: item.latitude,
                longitude: item.longitude,
                photos: (photosData || []).map((p: any) => p.photo_url),
                bedrooms: item.bedrooms,
                bathrooms: item.bathrooms,
                squareFeet: item.square_feet,
                availableDate: item.available_date,
                createdAt: new Date(item.created_at).getTime(),
                updatedAt: new Date(item.updated_at).getTime(),
              };
            })
          );
          
          // Separate my listings from others
          if (currentUser) {
            const myList = listings.filter(l => l.ownerId === currentUser.id);
            const otherList = listings.filter(l => l.ownerId !== currentUser.id);
            setMyListings(myList);
            setAllUserListings(otherList);
          } else {
            setMyListings([]);
            setAllUserListings(listings);
          }
        }
      } catch (error) {
        console.error('Error fetching listings:', error);
      }
    };

    fetchAllListings();
  }, [currentUser]);

  const handlePropertyPress = (property: Property) => {
    setSelectedPropertyId(property.id);
    if (onPropertySelect) {
      onPropertySelect(property);
    }
    // Navigate to detail screen
    navigation.navigate('ListingDetail', { listing: { ...property, source: 'external' } });
  };

  // Don't show loading/error for external listings - just show what we have from Supabase
  // External listings will load in the background

  const handleListingPress = (listing: Listing) => {
    setSelectedPropertyId(listing.id);
    navigation.navigate('ListingDetail', { listing: { ...listing, source: 'user' } });
  };

  // Transform external properties to Listing format
  const externalListings: Listing[] = datafinitiProperties.map((prop: Property) => ({
    id: prop.id,
    ownerId: '', // External listings don't have owners
    title: '',
    description: prop.description || '',
    address: prop.address,
    city: prop.city,
    state: prop.state,
    zipCode: '',
    price: prop.price,
    latitude: prop.latitude,
    longitude: prop.longitude,
    photos: [], // External listings get one photo assigned in ListingCard
    bedrooms: prop.numBedrooms,
    bathrooms: prop.numBathrooms,
    squareFeet: undefined,
    availableDate: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  // Combine all listings: Supabase listings + external properties
  const allListings = [...myListings, ...allUserListings, ...externalListings];
  
  // Get liked listings from all available listings
  const likedListingsData = allListings.filter(listing => isListingLiked(listing.id));

  // If showing liked listings, render that view
  if (showLikedListings) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            onPress={() => setShowLikedListings(false)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#6F4E37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Liked Listings</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, likedListingsData.length === 0 && styles.emptyScrollContent]}
          showsVerticalScrollIndicator={false}
        >
          {likedListingsData.length === 0 ? (
            <View style={styles.emptyLikedContainer}>
              <Ionicons name="heart-outline" size={64} color="#E8D5C4" />
              <Text style={styles.emptyText}>No liked listings yet</Text>
              <Text style={styles.emptySubtext}>Swipe right on listings to save them here</Text>
            </View>
          ) : (
            likedListingsData.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={[
                  styles.propertyCard,
                  selectedPropertyId === listing.id && styles.selectedCard,
                ]}
                onPress={() => {
                  setSelectedPropertyId(listing.id);
                  navigation.navigate('ListingDetail', { listing: { ...listing, source: listing.ownerId ? 'user' : 'external' } });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.imageContainer}>
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>Property Photo</Text>
                  </View>
                </View>
                <View style={styles.propertyInfo}>
                  <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
                  <Text style={styles.address}>{listing.address}</Text>
                  <Text style={styles.cityState}>
                    {listing.city}, {listing.state}
                  </Text>
                  {(listing.bedrooms || listing.bathrooms) && (
                    <View style={styles.detailsRow}>
                      {listing.bedrooms && (
                        <Text style={styles.detailText}>
                          {listing.bedrooms} bed
                        </Text>
                      )}
                      {listing.bedrooms && listing.bathrooms && (
                        <Text style={styles.detailText}> • </Text>
                      )}
                      {listing.bathrooms && (
                        <Text style={styles.detailText}>
                          {listing.bathrooms} bath
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Liked Listings button - always show if there are any liked listings */}
      <View style={styles.headerContainer}>
        <View style={styles.placeholder} />
        <Text style={styles.screenTitle}>Search</Text>
        {likedListingsData.length > 0 ? (
          <TouchableOpacity 
            onPress={() => setShowLikedListings(true)}
            style={styles.likedButton}
          >
            <Ionicons name="heart" size={20} color="#FF6B35" />
            <Text style={styles.likedButtonText}>Liked Listings</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* My Listings Section */}
        {myListings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Listings</Text>
            {myListings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={[
                  styles.propertyCard,
                  styles.myListingCard,
                  selectedPropertyId === listing.id && styles.selectedCard,
                ]}
                onPress={() => handleListingPress(listing)}
                activeOpacity={0.7}
              >
                {/* Property Image Placeholder */}
                <View style={styles.imageContainer}>
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>Property Photo</Text>
                  </View>
                </View>

                {/* Property Info - Inverted Colors */}
                <View style={[styles.propertyInfo, styles.myListingInfo]}>
                  <Text style={styles.myListingPrice}>${listing.price.toLocaleString()}</Text>
                  <Text style={styles.myListingAddress}>{listing.address}</Text>
                  <Text style={styles.myListingCityState}>
                    {listing.city}, {listing.state}
                  </Text>
                  {(listing.bedrooms || listing.bathrooms) && (
                    <View style={styles.detailsRow}>
                      {listing.bedrooms && (
                        <Text style={styles.myListingDetailText}>
                          {listing.bedrooms} bed
                        </Text>
                      )}
                      {listing.bedrooms && listing.bathrooms && (
                        <Text style={styles.myListingDetailText}> • </Text>
                      )}
                      {listing.bathrooms && (
                        <Text style={styles.myListingDetailText}>
                          {listing.bathrooms} bath
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* All User-Created Listings Section */}
        {allUserListings.length > 0 && (
          <>
            {myListings.length > 0 && <Text style={styles.sectionTitle}>All Listings</Text>}
            {allUserListings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={[
                  styles.propertyCard,
                  selectedPropertyId === listing.id && styles.selectedCard,
                ]}
                onPress={() => handleListingPress(listing)}
                activeOpacity={0.7}
              >
                {/* Property Image Placeholder */}
                <View style={styles.imageContainer}>
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>Property Photo</Text>
                  </View>
                </View>

                {/* Property Info */}
                <View style={styles.propertyInfo}>
                  <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
                  <Text style={styles.address}>{listing.address}</Text>
                  <Text style={styles.cityState}>
                    {listing.city}, {listing.state}
                  </Text>
                  {(listing.bedrooms || listing.bathrooms) && (
                    <View style={styles.detailsRow}>
                      {listing.bedrooms && (
                        <Text style={styles.detailText}>
                          {listing.bedrooms} bed
                        </Text>
                      )}
                      {listing.bedrooms && listing.bathrooms && (
                        <Text style={styles.detailText}> • </Text>
                      )}
                      {listing.bathrooms && (
                        <Text style={styles.detailText}>
                          {listing.bathrooms} bath
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* External Properties */}
        {externalListings.length > 0 && (
          <>
            {(myListings.length > 0 || allUserListings.length > 0) && <Text style={styles.sectionTitle}>External Listings</Text>}
            {externalListings.map((property) => (
          <TouchableOpacity
            key={property.id}
            style={[
              styles.propertyCard,
              selectedPropertyId === property.id && styles.selectedCard,
            ]}
            onPress={() => handlePropertyPress(property)}
            activeOpacity={0.7}
          >
            {/* Property Image Placeholder */}
            <View style={styles.imageContainer}>
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Property Photo</Text>
              </View>
            </View>

            {/* Property Info */}
            <View style={styles.propertyInfo}>
              <Text style={styles.price}>${property.price.toLocaleString()}</Text>
              <Text style={styles.address}>{property.address}</Text>
              <Text style={styles.cityState}>
                {property.city}, {property.state}
              </Text>
              {(property.numBedrooms || property.numBathrooms) && (
                <View style={styles.detailsRow}>
                  {property.numBedrooms && (
                    <Text style={styles.detailText}>
                      {property.numBedrooms} bed
                    </Text>
                  )}
                  {property.numBedrooms && property.numBathrooms && (
                    <Text style={styles.detailText}> • </Text>
                  )}
                  {property.numBathrooms && (
                    <Text style={styles.detailText}>
                      {property.numBathrooms} bath
                    </Text>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6F4E37',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLikedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#A68B7B',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A68B7B',
    marginTop: 8,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF5E1',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8D5C4',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
  },
  placeholder: {
    width: 40,
  },
  likedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B35',
    gap: 6,
  },
  likedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E8D5C4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#FF6B35',
    borderWidth: 3,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#E8D5C4',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8D5C4',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#A68B7B',
  },
  propertyInfo: {
    padding: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6F4E37',
    marginBottom: 8,
  },
  address: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 4,
  },
  cityState: {
    fontSize: 14,
    color: '#A68B7B',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#6F4E37',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6F4E37',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  myListingCard: {
    borderColor: '#6F4E37',
  },
  myListingInfo: {
    backgroundColor: '#6F4E37',
  },
  myListingPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  myListingAddress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  myListingCityState: {
    fontSize: 14,
    color: '#E8D5C4',
    marginBottom: 8,
  },
  myListingDetailText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});

