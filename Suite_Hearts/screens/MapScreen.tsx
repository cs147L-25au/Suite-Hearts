import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { Listing } from '../types';

export default function MapScreen() {
  const { users } = useUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [region, setRegion] = useState({
    latitude: 37.7749, // Default to San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  // Get listings from homeowners (for now, we'll create mock data structure)
  // In production, this would come from Supabase
  useEffect(() => {
    // TODO: Fetch listings from Supabase
    // For now, empty array - will be populated when listings are created
    setListings([]);
  }, []);

  const handleMarkerPress = (listing: Listing) => {
    setSelectedListing(listing);
  };

  const closeModal = () => {
    setSelectedListing(null);
  };

  return (
    <View style={styles.container}>
      {listings.length === 0 ? (
        // Empty State - Show as background when no listings
        <View style={styles.emptyStateBackground}>
          <Ionicons name="map-outline" size={64} color="#E8D5C4" />
          <Text style={styles.emptyStateText}>No listings yet</Text>
          <Text style={styles.emptyStateSubtext}>Listings will appear on the map once created</Text>
        </View>
      ) : (
        // Map View - Only show when there are listings
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          mapType="standard"
        >
          {listings.map((listing) => (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: listing.latitude,
                longitude: listing.longitude,
              }}
              onPress={() => handleMarkerPress(listing)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <Text style={styles.markerPrice}>${listing.price.toLocaleString()}</Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Listing Detail Modal */}
      <Modal
        visible={selectedListing !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Ionicons name="close" size={24} color="#6F4E37" />
            </TouchableOpacity>

            {selectedListing && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {/* Photo Placeholder */}
                <View style={styles.photoContainer}>
                  {selectedListing.photos && selectedListing.photos.length > 0 ? (
                    <Image
                      source={{ uri: selectedListing.photos[0] }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="home" size={64} color="#E8D5C4" />
                      <Text style={styles.photoPlaceholderText}>No photo available</Text>
                    </View>
                  )}
                </View>

                {/* Listing Info */}
                <View style={styles.listingInfo}>
                  <Text style={styles.price}>${selectedListing.price.toLocaleString()}</Text>
                  <Text style={styles.address}>{selectedListing.address}</Text>
                  <Text style={styles.cityState}>
                    {selectedListing.city}, {selectedListing.state} {selectedListing.zipCode}
                  </Text>
                  
                  {selectedListing.bedrooms && selectedListing.bathrooms && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailText}>
                        {selectedListing.bedrooms} bed • {selectedListing.bathrooms} bath
                      </Text>
                      {selectedListing.squareFeet && (
                        <Text style={styles.detailText}> • {selectedListing.squareFeet} sq ft</Text>
                      )}
                    </View>
                  )}

                  {selectedListing.description && (
                    <Text style={styles.description}>{selectedListing.description}</Text>
                  )}

                  <TouchableOpacity style={styles.messageButton}>
                    <Ionicons name="mail" size={20} color="#FFF5E1" />
                    <Text style={styles.messageButtonText}>Message Owner</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
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
  modalContent: {
    backgroundColor: '#FFF5E1',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  modalScrollView: {
    flex: 1,
  },
  photoContainer: {
    width: '100%',
    height: 250,
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
  listingInfo: {
    padding: 20,
  },
  price: {
    fontSize: 28,
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
    fontSize: 16,
    color: '#A68B7B',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailText: {
    fontSize: 16,
    color: '#6F4E37',
  },
  description: {
    fontSize: 16,
    color: '#6F4E37',
    lineHeight: 24,
    marginBottom: 20,
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
  emptyStateBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5E1',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
  },
});

