import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useProperties } from '../context/PropertyContext';
import { Listing, HomeStackParamList } from '../types';
import { Property } from '../lib/datafiniti';
import { supabase } from '../lib/supabase';
import { getRandomRealEstatePhotos } from '../lib/photoUtils';

type MapScreenNavigationProp = StackNavigationProp<HomeStackParamList>;

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Combined property type for display
type MapProperty = (Property & { source: 'external' }) | (Listing & { source: 'user' });

export default function MapScreen() {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const { currentUser } = useUser();
  const { properties: datafinitiProperties, selectedPropertyId, setSelectedPropertyId } = useProperties();
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null);
  const mapRef = useRef<MapView>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [region, setRegion] = useState({
    latitude: 37.7749, // Default to San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  // Fetch user listings from Supabase
  const fetchUserListings = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, listing_photos(photo_url, photo_order)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching listings:', error);
        return;
      }

      if (data) {
        // Transform Supabase data to Listing format
        const listings: Listing[] = data.map((item: any) => ({
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
          photos: (item.listing_photos || [])
            .sort((a: any, b: any) => (a.photo_order ?? 0) - (b.photo_order ?? 0))
            .map((p: any) => p.photo_url),
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          squareFeet: item.square_feet,
          availableDate: item.available_date,
          createdAt: new Date(item.created_at).getTime(),
          updatedAt: new Date(item.updated_at).getTime(),
        }));
        setUserListings(listings);
      }
    } catch (error) {
      console.error('Error fetching user listings:', error);
    }
  }, []);

  useEffect(() => {
    fetchUserListings();
  }, [fetchUserListings]);

  // Refresh listings whenever this tab gains focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserListings();
    }, [fetchUserListings])
  );

  // Combine external properties and user listings
  const allProperties: MapProperty[] = [
    ...datafinitiProperties.map(p => ({ ...p, source: 'external' as const })),
    ...userListings.map(l => ({ ...l, source: 'user' as const })),
  ];

  // Center map on selected property when selection changes
  useEffect(() => {
    if (selectedPropertyId && mapRef.current) {
      const property = allProperties.find(p => p.id === selectedPropertyId);
      if (property) {
        mapRef.current.animateToRegion({
          latitude: property.latitude,
          longitude: property.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 500);
      }
    }
  }, [selectedPropertyId, datafinitiProperties, userListings]);

  const handleMarkerPress = (property: MapProperty) => {
    setSelectedProperty(property);
    setSelectedPropertyId(property.id);
    setCurrentPhotoIndex(0);
  };

  const closeModal = () => {
    setSelectedProperty(null);
    setSelectedPropertyId(null);
    setCurrentPhotoIndex(0);
  };

  const getPhotos = (property: MapProperty): (string | number | { uri: string })[] => {
    if (property.source === 'user' && property.photos && property.photos.length > 0) {
      return property.photos;
    }
    // For external properties, get random photos
    return getRandomRealEstatePhotos(property.id, 1);
  };

  const handleViewFullListing = () => {
    if (selectedProperty) {
      closeModal();
      navigation.navigate('ListingDetail', { listing: selectedProperty });
    }
  };

  const handlePreviousPhoto = () => {
    if (selectedProperty) {
      const photos = getPhotos(selectedProperty);
      if (photos.length > 0) {
        setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
      }
    }
  };

  const handleNextPhoto = () => {
    if (selectedProperty) {
      const photos = getPhotos(selectedProperty);
      if (photos.length > 0) {
        setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Always show map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        mapType="standard"
      >
        {allProperties.map((property) => {
          const isMyListing = property.source === 'user' && currentUser && property.ownerId === currentUser.id;
          const isSelected = selectedPropertyId === property.id;
          return (
            <Marker
              key={property.id}
              coordinate={{
                latitude: property.latitude,
                longitude: property.longitude,
              }}
              onPress={() => handleMarkerPress(property)}
            >
              <View style={styles.markerContainer}>
                <View style={[
                  isMyListing ? styles.markerMyListing : styles.marker,
                  isSelected && styles.selectedMarker
                ]}>
                  <Text style={styles.markerPrice}>${property.price.toLocaleString()}</Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Property Detail Modal */}
      <Modal
        visible={selectedProperty !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeModal}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContentContainer}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={24} color="#6F4E37" />
              </TouchableOpacity>

              {selectedProperty && (
                <View style={styles.modalBody}>
                  {/* Photo Slider */}
                  <View style={styles.photoContainer}>
                    {(() => {
                      const photos = getPhotos(selectedProperty);
                      if (photos.length > 0) {
                        const currentPhoto = photos[currentPhotoIndex];
                        return (
                          <>
                            <Image
                              source={
                                typeof currentPhoto === 'string' 
                                  ? { uri: currentPhoto }
                                  : typeof currentPhoto === 'number'
                                  ? currentPhoto
                                  : currentPhoto
                              }
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
                        );
                      } else {
                        return (
                          <View style={styles.photoPlaceholder}>
                            <Ionicons name="home" size={64} color="#E8D5C4" />
                            <Text style={styles.photoPlaceholderText}>No photo available</Text>
                          </View>
                        );
                      }
                    })()}
                  </View>

                  {/* Property Info */}
                  <View style={styles.listingInfo}>
                    <Text style={styles.price}>${selectedProperty.price.toLocaleString()}/mo</Text>
                    
                    {((selectedProperty.source === 'user' && (selectedProperty.bedrooms || selectedProperty.bathrooms)) ||
                      (selectedProperty.source === 'external' && (selectedProperty.numBedrooms || selectedProperty.numBathrooms))) && (
                      <View style={styles.detailsRow}>
                        <Text style={styles.detailText}>
                          {selectedProperty.source === 'user' 
                            ? `${selectedProperty.bedrooms || 0} bed • ${selectedProperty.bathrooms || 0} bath`
                            : `${selectedProperty.numBedrooms || 0} bed • ${selectedProperty.numBathrooms || 0} bath`
                          }
                        </Text>
                      </View>
                    )}

                    <Text style={styles.address}>{selectedProperty.address}</Text>
                    <Text style={styles.cityState}>
                      {selectedProperty.city}, {selectedProperty.state}
                      {selectedProperty.source === 'user' && selectedProperty.zipCode && ` ${selectedProperty.zipCode}`}
                    </Text>

                    <TouchableOpacity style={styles.viewFullButton} onPress={handleViewFullListing}>
                      <Text style={styles.viewFullButtonText}>View Full Listing</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFF5E1" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerMyListing: {
    backgroundColor: '#6F4E37',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedMarker: {
    borderWidth: 3,
    borderColor: '#FF6B35',
  },
  markerPrice: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.5,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF5E1',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '100%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D5C4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalBody: {
    flex: 1,
  },
  photoContainer: {
    width: '100%',
    height: 200,
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
  listingInfo: {
    padding: 20,
    flex: 1,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6F4E37',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6F4E37',
    marginTop: 8,
    marginBottom: 4,
  },
  cityState: {
    fontSize: 14,
    color: '#A68B7B',
    marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
  },
  viewFullButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 'auto',
  },
  viewFullButtonText: {
    color: '#FFF5E1',
    fontSize: 16,
    fontWeight: '600',
  },
});

