import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, FlatList, Alert, TextInput, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useUser } from '../context/UserContext';
import { Listing } from '../types';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ManageListingsScreen() {
  const { currentUser } = useUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser) {
      loadListings();
    }
  }, [currentUser]);

  const loadListings = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading listings:', error);
        setListings([]);
        return;
      }

      if (!data || data.length === 0) {
        setListings([]);
        return;
      }

      // Fetch photos for each listing
      const listingsWithPhotos = await Promise.all(
        data.map(async (item: any) => {
          const { data: photosData } = await supabase
            .from('listing_photos')
            .select('photo_url')
            .eq('listing_id', item.id)
            .order('photo_order', { ascending: true });

          return {
            id: item.id,
            ownerId: item.owner_id,
            title: item.title || `${item.address}, ${item.city}`,
            description: item.description || '',
            address: item.address,
            city: item.city,
            state: item.state,
            zipCode: item.zip_code,
            price: parseFloat(item.price),
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
            squareFeet: item.square_feet,
            availableDate: item.available_date,
            photos: (photosData || []).map((p: any) => p.photo_url),
            createdAt: new Date(item.created_at).getTime(),
            updatedAt: new Date(item.updated_at).getTime(),
          };
        })
      );

      setListings(listingsWithPhotos);
    } catch (error) {
      console.error('Error loading listings:', error);
      setListings([]);
    }
  };

  const handleDeleteListing = (listingId: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', listingId);

              if (error) {
                console.error('Error deleting listing:', error);
                Alert.alert('Error', 'Failed to delete listing');
              } else {
                loadListings();
              }
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
            }
          },
        },
      ]
    );
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedListings(new Set());
  };

  const toggleListingSelection = (listingId: string) => {
    const newSelected = new Set(selectedListings);
    if (newSelected.has(listingId)) {
      newSelected.delete(listingId);
    } else {
      newSelected.add(listingId);
    }
    setSelectedListings(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedListings.size === 0) return;
    
    Alert.alert(
      'Delete Listings',
      `Are you sure you want to delete ${selectedListings.size} listing(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const listingId of selectedListings) {
                const { error } = await supabase
                  .from('listings')
                  .delete()
                  .eq('id', listingId);
                
                if (error) {
                  console.error('Error deleting listing:', error);
                }
              }
              setIsDeleteMode(false);
              setSelectedListings(new Set());
              loadListings();
            } catch (error) {
              console.error('Error deleting listings:', error);
              Alert.alert('Error', 'Failed to delete some listings');
            }
          },
        },
      ]
    );
  };

  if (!currentUser || currentUser.userType !== 'homeowner') {
    return (
      <View style={styles.container}>
        <Text style={styles.noAccessText}>This screen is for homeowners only</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage My Listings</Text>
        {isDeleteMode ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleDeleteMode} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteSelected}
              disabled={selectedListings.size === 0}
              style={styles.headerButton}
            >
              <Ionicons
                name="trash"
                size={24}
                color={selectedListings.size > 0 ? '#DC3545' : '#A68B7B'}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={toggleDeleteMode} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={24} color="#6F4E37" />
          </TouchableOpacity>
        )}
      </View>

      {/* Add Listing Button - Centered (hidden in delete mode) */}
      {!isDeleteMode && (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              console.log('Add Listing button pressed');
              setShowAddForm(true);
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Listing</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Listings List */}
      {listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={64} color="#E8D5C4" />
          <Text style={styles.emptyText}>No listings yet</Text>
          <Text style={styles.emptySubtext}>Tap "Add Listing" to create your first listing</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = selectedListings.has(item.id);
            return (
              <TouchableOpacity
                style={[styles.listingCard, isSelected && styles.listingCardSelected]}
                onPress={() => {
                  if (isDeleteMode) {
                    toggleListingSelection(item.id);
                  }
                }}
                onLongPress={() => {
                  if (!isDeleteMode) {
                    setIsDeleteMode(true);
                    toggleListingSelection(item.id);
                  }
                }}
                activeOpacity={0.7}
              >
                {/* Header: X Bed x bath | City | Edit | Delete */}
                <View style={styles.listingHeader}>
                  <Text style={styles.listingHeaderText}>
                    {item.bedrooms ? `${item.bedrooms} Bed` : ''} {item.bathrooms ? `${item.bathrooms} bath` : ''} {item.bedrooms || item.bathrooms ? ' | ' : ''}{item.city}
                  </Text>
                  {isDeleteMode ? (
                    <View style={styles.checkboxContainer}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.listingActions}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingListing(item);
                          setShowAddForm(true);
                        }}
                        style={styles.actionButton}
                      >
                        <Text style={styles.editLinkText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

              {/* Cover Photo */}
              <View style={styles.listingPhotoContainer}>
                {item.photos && item.photos.length > 0 ? (
                  <Image source={{ uri: item.photos[0] }} style={styles.listingPhoto} />
                ) : (
                  <View style={styles.listingPhotoPlaceholder}>
                    <Ionicons name="home" size={48} color="#E8D5C4" />
                    <Text style={styles.photoPlaceholderText}>Cover photo</Text>
                  </View>
                )}
              </View>

                {/* Location/Address at bottom */}
                <View style={styles.listingAddressContainer}>
                  <Text style={styles.listingAddressText}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Add/Edit Listing Form Modal */}
      <AddListingForm
        onClose={() => {
          setShowAddForm(false);
          setEditingListing(null);
        }}
        onSave={() => {
          loadListings();
          setShowAddForm(false);
          setEditingListing(null);
        }}
        editingListing={editingListing}
        visible={showAddForm}
      />
    </View>
  );
}

function AddListingForm({ onClose, onSave, editingListing, visible }: { onClose: () => void; onSave: () => void; editingListing: Listing | null; visible: boolean }) {
  const { currentUser } = useUser();
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    description: '',
    bedrooms: '',
    bathrooms: '',
    price: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef<MapView>(null);

  // Reset form when modal opens/closes or editingListing changes
  useEffect(() => {
    if (visible) {
      if (editingListing) {
        setFormData({
          title: editingListing.title || '',
          address: editingListing.address || '',
          description: editingListing.description || '',
          bedrooms: editingListing.bedrooms?.toString() || '',
          bathrooms: editingListing.bathrooms?.toString() || '',
          price: editingListing.price?.toString() || '',
        });
        setPhotos(editingListing.photos || []);
        if (editingListing.latitude && editingListing.longitude) {
          setSelectedLocation({
            latitude: editingListing.latitude,
            longitude: editingListing.longitude,
          });
          setMapRegion({
            latitude: editingListing.latitude,
            longitude: editingListing.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } else {
        setFormData({
          title: '',
          address: '',
          description: '',
          bedrooms: '',
          bathrooms: '',
          price: '',
        });
        setPhotos([]);
        setSelectedLocation(null);
      }
    }
  }, [visible, editingListing]);

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to upload photos!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;

    // Validation
    if (!formData.address) {
      Alert.alert('Error', 'Please enter an address');
      return;
    }

    if (!selectedLocation) {
      Alert.alert('Error', 'Please pin the location on the map');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const priceValue = parseFloat(formData.price);
    if (priceValue < 400 || priceValue > 10000) {
      Alert.alert('Invalid Price', 'Monthly rent must be between $400 and $10,000');
      return;
    }

    try {
      // Parse address to extract city (simple parsing - in production use geocoding)
      const addressParts = formData.address.split(',').map(s => s.trim());
      const city = addressParts.length > 1 ? addressParts[addressParts.length - 2] : 'San Francisco';
      const stateZip = addressParts.length > 0 ? addressParts[addressParts.length - 1] : 'CA 94102';
      const state = stateZip.split(' ')[0] || 'CA';
      const zipCode = stateZip.split(' ')[1] || '94102';

      const listingData: any = {
        owner_id: currentUser.id,
        title: formData.title || formData.address,
        description: formData.description || '',
        address: formData.address,
        city: city,
        state: state,
        zip_code: zipCode,
        price: parseFloat(formData.price),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
      };

      let listingId: string;

      if (editingListing) {
        // Update existing listing
        const { error } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', editingListing.id);

        if (error) {
          console.error('Error updating listing:', error);
          Alert.alert('Error', 'Failed to update listing');
          return;
        }
        listingId = editingListing.id;
      } else {
        // Create new listing
        const { data, error } = await supabase
          .from('listings')
          .insert(listingData)
          .select()
          .single();

        if (error) {
          console.error('Error creating listing:', error);
          Alert.alert('Error', 'Failed to create listing');
          return;
        }
        listingId = data.id;
      }

      // Upload photos to Supabase Storage and save to listing_photos table
      if (photos.length > 0) {
        // First, delete existing photos if editing
        if (editingListing) {
          // Delete from storage
          const { data: existingPhotos } = await supabase
            .from('listing_photos')
            .select('photo_url')
            .eq('listing_id', listingId);
          
          if (existingPhotos) {
            for (const photo of existingPhotos) {
              // Extract path from URL if it's a storage URL
              if (photo.photo_url.includes('supabase.co/storage/v1/object/public/listing-photos/')) {
                const urlParts = photo.photo_url.split('listing-photos/');
                if (urlParts.length > 1) {
                  const filePath = urlParts[1];
                  await supabase.storage
                    .from('listing-photos')
                    .remove([filePath]);
                }
              }
            }
          }
          
          // Delete from database
          await supabase
            .from('listing_photos')
            .delete()
            .eq('listing_id', listingId);
        }

        // Upload photos to Supabase Storage
        const uploadedPhotoUrls: string[] = [];
        for (let index = 0; index < photos.length; index++) {
          const photoUri = photos[index];
          
          // Check if it's already a URL (from Supabase Storage) or a local file
          if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
            // Already uploaded, use as-is
            uploadedPhotoUrls.push(photoUri);
          } else {
            // Local file, need to upload
            try {
              // Read the file
              const response = await fetch(photoUri);
              const blob = await response.blob();
              
              // Create file path: listing-photos/{owner_id}/{listing_id}/photo-{index}.jpg
              const fileExt = photoUri.split('.').pop() || 'jpg';
              const fileName = `photo-${index}.${fileExt}`;
              const filePath = `${currentUser.id}/${listingId}/${fileName}`;
              
              // Upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('listing-photos')
                .upload(filePath, blob, {
                  contentType: blob.type || 'image/jpeg',
                  upsert: true,
                });
              
              if (uploadError) {
                console.error('Error uploading photo:', uploadError);
                // Continue with next photo
                continue;
              }
              
              // Get public URL
              const { data: urlData } = supabase.storage
                .from('listing-photos')
                .getPublicUrl(filePath);
              
              if (urlData?.publicUrl) {
                uploadedPhotoUrls.push(urlData.publicUrl);
              } else {
                console.error('Failed to get public URL for photo');
              }
            } catch (error) {
              console.error('Error processing photo:', error);
              // Continue with next photo
            }
          }
        }

        // Insert photo URLs into listing_photos table
        if (uploadedPhotoUrls.length > 0) {
          const photoInserts = uploadedPhotoUrls.map((photoUrl, index) => ({
            listing_id: listingId,
            photo_url: photoUrl,
            photo_order: index,
          }));

          const { error: photoError } = await supabase
            .from('listing_photos')
            .insert(photoInserts);

          if (photoError) {
            console.error('Error saving photos to database:', photoError);
            // Continue anyway - listing is saved
          }
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving listing:', error);
      Alert.alert('Error', 'Failed to save listing');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <ScrollView 
            style={styles.formScrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formScrollContent}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with back button */}
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#6F4E37" />
                <Text style={styles.backButtonText}>Manage my listings</Text>
              </TouchableOpacity>
            </View>

            {/* Listing Title */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Listing Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Cozy 2BR Apartment in Mission"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
            </View>

            {/* Photo Upload */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Photos</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.photoScrollView} 
                contentContainerStyle={styles.photoScrollContent}
              >
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoPreview}>
                    <Image source={{ uri: photo }} style={styles.photoPreviewImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={24} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addPhotoButton} onPress={handleImageUpload}>
                  <Ionicons name="add" size={32} color="#FF6B35" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Location/Address */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Street address, City, State ZIP"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
              />
            </View>

            {/* Price */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Monthly Rent ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter monthly rent"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                keyboardType="numeric"
              />
            </View>

            {/* Bed, Bath */}
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.halfField]}>
                <Text style={styles.fieldLabel}>Bedrooms</Text>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Number of bedrooms"
                  value={formData.bedrooms}
                  onChangeText={(text) => setFormData({ ...formData, bedrooms: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formField, styles.halfField]}>
                <Text style={styles.fieldLabel}>Bathrooms</Text>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Number of bathrooms"
                  value={formData.bathrooms}
                  onChangeText={(text) => setFormData({ ...formData, bathrooms: text })}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Map Picker */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Pin Location on Map *</Text>
              <TouchableOpacity
                style={styles.mapPickerButton}
                onPress={() => setShowMapPicker(true)}
                activeOpacity={0.7}
              >
                {selectedLocation ? (
                  <View style={styles.mapPickerSelected}>
                    <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
                    <Text style={styles.mapPickerText}>Location pinned</Text>
                    <Text style={styles.mapPickerSubtext}>
                      {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.mapPickerEmpty}>
                    <Ionicons name="location-outline" size={24} color="#FF6B35" />
                    <Text style={styles.mapPickerText}>Tap to pin location on map</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Listing Bio */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your listing... amenities, neighborhood, what makes it special"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Done Button */}
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.doneButton} onPress={handleSave}>
                <Text style={styles.doneButtonText}>{editingListing ? 'Update Listing' : 'Create Listing'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Map Picker Modal */}
      <Modal
        visible={showMapPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMapPicker(false)}
      >
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContent}>
            <View style={styles.mapModalHeader}>
              <Text style={styles.mapModalTitle}>Pin Your Listing Location</Text>
              <TouchableOpacity
                onPress={() => setShowMapPicker(false)}
                style={styles.mapModalClose}
              >
                <Ionicons name="close" size={24} color="#6F4E37" />
              </TouchableOpacity>
            </View>
            <Text style={styles.mapModalInstructions}>
              Tap on the map to set the exact location of your listing
            </Text>
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={styles.mapPicker}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              onPress={handleMapPress}
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  draggable
                  onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
                >
                  <View style={styles.mapMarker}>
                    <Ionicons name="location" size={32} color="#FF6B35" />
                  </View>
                </Marker>
              )}
            </MapView>
            <View style={styles.mapModalActions}>
              <TouchableOpacity
                style={styles.mapConfirmButton}
                onPress={() => {
                  if (selectedLocation) {
                    setShowMapPicker(false);
                  } else {
                    Alert.alert('No location selected', 'Please tap on the map to select a location');
                  }
                }}
              >
                <Text style={styles.mapConfirmButtonText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFF5E1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6F4E37',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '600',
  },
  addButtonContainer: {
    alignItems: 'center',
    paddingBottom: 20,
    backgroundColor: '#FFF5E1',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
  },
  noAccessText: {
    fontSize: 18,
    color: '#6F4E37',
    textAlign: 'center',
    marginTop: 100,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8D5C4',
    position: 'relative',
  },
  listingCardSelected: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    backgroundColor: '#FFF5E1',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#A68B7B',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  listingHeaderText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
    flex: 1,
    marginRight: 40, // Add margin to prevent overlap with checkbox
  },
  listingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  editLinkText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  listingPhotoContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#E8D5C4',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#A68B7B',
  },
  listingAddressContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  listingAddressText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
  },
  listingPhoto: {
    width: '100%',
    height: '100%',
  },
  listingPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFF5E1',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '90%',
    minHeight: '70%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formScrollView: {
    flex: 1,
  },
  formScrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  formHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
  },
  photoSection: {
    paddingBottom: 20,
  },
  photoScrollView: {
    marginTop: 0,
  },
  photoScrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    marginRight: 12,
    position: 'relative',
  },
  photoPreviewImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  addPhotoButton: {
    width: 200,
    height: 150,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  addPhotoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  formField: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
    paddingBottom: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  halfField: {
    flex: 0.48,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  thirdField: {
    flex: 1,
    marginBottom: 0,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8D5C4',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#6F4E37',
    width: '100%',
  },
  halfInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  formActions: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  doneButton: {
    width: '100%',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  mapPickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4',
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  mapPickerSelected: {
    alignItems: 'center',
  },
  mapPickerEmpty: {
    alignItems: 'center',
    gap: 8,
  },
  mapPickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F4E37',
    marginTop: 4,
  },
  mapPickerSubtext: {
    fontSize: 12,
    color: '#A68B7B',
    marginTop: 4,
  },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mapModalContent: {
    flex: 1,
    backgroundColor: '#FFF5E1',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  mapModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6F4E37',
  },
  mapModalClose: {
    padding: 4,
  },
  mapModalInstructions: {
    fontSize: 14,
    color: '#A68B7B',
    paddingHorizontal: 20,
    paddingBottom: 16,
    textAlign: 'center',
  },
  mapPicker: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapModalActions: {
    padding: 20,
    paddingTop: 16,
  },
  mapConfirmButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  mapConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});