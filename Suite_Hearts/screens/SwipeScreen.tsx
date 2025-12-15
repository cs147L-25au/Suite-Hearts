import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, PanResponder, Modal, ScrollView, Image, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useProperties } from '../context/PropertyContext';
import { User, Listing } from '../types';
import RoommateCard from '../components/RoommateCard';
import ListingCard from '../components/ListingCard';
import { getRecommendedRoommates, getRecommendedListings } from '../lib/recommendation';
import { supabase } from '../lib/supabase';
import { Property } from '../lib/datafiniti';
import { getRandomRealEstatePhotos } from '../lib/photoUtils';

const Tab = createMaterialTopTabNavigator();
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SwipeScreen() {
  const { currentUser, users, addLikedListing, getUserById } = useUser();
  const { properties: datafinitiProperties } = useProperties();
  const [roommates, setRoommates] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  // Check if profile is complete (required fields only - job and prompts are optional)
  const isProfileComplete = (user: User): boolean => {
    // Required fields: personal info, bio, and lifestyle preferences (friendliness, cleanliness, guestsAllowed are REQUIRED)
    const baseFields = ['age', 'race', 'gender', 'hometown', 'location', 'smoking', 'drinking', 'drugs', 'nightOwl', 'religion', 'bio', 'friendliness', 'cleanliness', 'guestsAllowed'];
    
    let requiredFields: string[] = [];
    if (user.userType === 'homeowner') {
      requiredFields = [...baseFields, 'yearsExperience'];
    } else {
      // All searchers need housing preferences (even if only looking for roommates)
      const searcherFields = [...baseFields, 'university', 'pets', 'maxRoommates', 'roommateType', 'preferredCity', 'spaceType', 'leaseDuration'];
      requiredFields = searcherFields;
      // Check budget separately
      if (!user.minBudget || !user.maxBudget) return false;
    }

    return requiredFields.every(field => {
      if (field === 'budget') {
        return user.minBudget && user.maxBudget;
      }
      if (field === 'spaceType') {
        const value = (user as any)[field];
        return Array.isArray(value) ? value.length > 0 : (value && value.toString().trim() !== '');
      }
      if (field === 'maxRoommates') {
        const value = (user as any)[field];
        return value !== null && value !== undefined && value !== '';
      }
      if (field === 'friendliness' || field === 'cleanliness') {
        // These are numbers 1-10 (REQUIRED)
        const value = (user as any)[field];
        return value !== null && value !== undefined && value >= 1 && value <= 10;
      }
      if (field === 'guestsAllowed') {
        // This is required (REQUIRED)
        const value = (user as any)[field];
        return value !== null && value !== undefined && value !== '';
      }
      const value = (user as any)[field];
      if (value === null || value === undefined) return false;
      if (Array.isArray(value)) return value.length > 0;
      const stringValue = value.toString().trim();
      return stringValue !== '' && stringValue !== 'null' && stringValue !== 'undefined';
    });
  };

  useEffect(() => {
    if (!currentUser) return;

    // Filter users based on what current user is looking for
    if (currentUser.userType === 'searcher') {
      // Get potential roommates (other searchers looking for roommates)
      const potentialRoommates = users.filter(
        (user) =>
          user.id !== currentUser.id &&
          user.userType === 'searcher' &&
          (user.lookingFor === 'roommates' || user.lookingFor === 'both')
      );

      console.log('=== ROOMMATE RECOMMENDATIONS DEBUG ===');
      console.log('Current User:', {
        name: currentUser.name,
        id: currentUser.id,
        userType: currentUser.userType,
        lookingFor: currentUser.lookingFor,
        preferredCity: currentUser.preferredCity,
        location: currentUser.location,
        profileComplete: isProfileComplete(currentUser)
      });
      console.log('Total Users in Context:', users.length);
      console.log('Users List (first 10):', users.slice(0, 10).map(u => ({ 
        name: u.name, 
        id: u.id,
        userType: u.userType,
        lookingFor: u.lookingFor,
        city: u.preferredCity || u.location 
      })));
      console.log('All User IDs:', users.map(u => u.id));
      console.log('Current User ID:', currentUser.id);
      
      console.log('Potential Roommates (before filtering):', potentialRoommates.length);
      console.log('Potential Roommates Details:', potentialRoommates.map(u => ({ 
        name: u.name, 
        city: u.preferredCity || u.location,
        profileComplete: isProfileComplete(u)
      })));

      // Use recommendation algorithm to rank roommates
      const recommendations = getRecommendedRoommates(currentUser, potentialRoommates, 0.3);
      console.log('Recommendations (after algorithm):', recommendations.length);
      console.log('Recommendations with scores:', recommendations.map(r => ({ 
        name: (r.candidate as User).name, 
        score: r.score,
        city: (r.candidate as User).preferredCity || (r.candidate as User).location
      })));
      
      const rankedRoommates = recommendations.map(rec => rec.candidate as User);
      setRoommates(rankedRoommates);
      console.log('Final Roommates Count:', rankedRoommates.length);
      console.log('Roommates Set:', rankedRoommates.map(r => r.name));
      console.log('=====================================');

      // Fetch listings from Supabase and Datafiniti
      const fetchListings = async () => {
        try {
          // Fetch user-created listings from Supabase
          const { data: supabaseListings, error: supabaseError } = await supabase
            .from('listings')
            .select('*')
            .order('created_at', { ascending: false });

          if (supabaseError) {
            console.error('Error fetching listings from Supabase:', supabaseError);
          }

          // Transform Supabase listings and fetch photos
          const userListings: Listing[] = await Promise.all(
            (supabaseListings || []).map(async (item: any) => {
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

          // Transform external properties to Listing format
          const externalListings: Listing[] = datafinitiProperties.map((prop: Property) => ({
            id: prop.id,
            ownerId: '', // External listings don't have owners
            title: `${prop.address}, ${prop.city}`,
            description: prop.description || '', // Include description from external source
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

          // Combine all listings (user-created and external only - no mock data)
          const allListings = [...userListings, ...externalListings];

          console.log('=== LISTING RECOMMENDATIONS DEBUG ===');
          console.log('Current User for Listings:', {
            preferredCity: currentUser.preferredCity,
            location: currentUser.location,
            minBudget: currentUser.minBudget,
            maxBudget: currentUser.maxBudget
          });
          console.log('User Listings from Supabase:', userListings.length);
          console.log('User Listings Details:', userListings.map(l => ({ 
            address: l.address, 
            city: l.city, 
            price: l.price,
            ownerId: l.ownerId
          })));
          console.log('External Listings:', externalListings.length);
          console.log('External Listings Details:', externalListings.map(l => ({ 
            address: l.address, 
            city: l.city, 
            price: l.price
          })));
          console.log('Total Listings (user-created + external only, no mock data):', allListings.length);

          // Use recommendation algorithm to rank listings
          const listingRecommendations = getRecommendedListings(currentUser, allListings, 0.3);
          console.log('Listing Recommendations (after algorithm):', listingRecommendations.length);
          console.log('Listing Recommendations with scores:', listingRecommendations.map(r => ({ 
            address: (r.candidate as Listing).address, 
            city: (r.candidate as Listing).city,
            price: (r.candidate as Listing).price,
            score: r.score
          })));
          
          const rankedListings = listingRecommendations.map(rec => rec.candidate as Listing);
          setListings(rankedListings);
          console.log('Final Listings Count:', rankedListings.length);
          console.log('====================================');
        } catch (error) {
          console.error('Error fetching listings:', error);
          setListings([]);
        }
      };

      fetchListings();
    }
  }, [currentUser, users, datafinitiProperties]);

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>Please sign up first</Text>
      </View>
    );
  }

  // Check if profile is complete
  const profileComplete = isProfileComplete(currentUser);
  
  if (!profileComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.incompleteProfileContainer}>
          <Ionicons name="information-circle" size={64} color="#FF6B35" />
          <Text style={styles.incompleteProfileTitle}>Complete Your Profile</Text>
          <Text style={styles.incompleteProfileText}>
            Please complete all required fields in your profile before you can start swiping.
          </Text>
          <Text style={styles.incompleteProfileSubtext}>
            Go to the Profile tab to add your information.
          </Text>
        </View>
      </View>
    );
  }

  // Determine which tabs to show based on what user is looking for
  // NOTE: All searchers have the same profile setup. The only difference is what they can swipe on:
  // - "roommates": only Roommates tab
  // - "housing": only Houses tab
  // - "both": both tabs
  const showRoommatesTab = currentUser.userType === 'searcher' && 
    (currentUser.lookingFor === 'roommates' || currentUser.lookingFor === 'both');
  const showHousesTab = currentUser.userType === 'searcher' && 
    (currentUser.lookingFor === 'housing' || currentUser.lookingFor === 'both');
  const isRoommateOnly = currentUser.userType === 'searcher' && currentUser.lookingFor === 'roommates';
  const isHousingOnly = currentUser.userType === 'searcher' && currentUser.lookingFor === 'housing';

  // If user is a homeowner, they shouldn't see swipe screen
  if (currentUser.userType === 'homeowner') {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>Swipe feature is for searchers only</Text>
      </View>
    );
  }

  // For roommate-only users, show conversion prompt if no houses tab
  if (isRoommateOnly && !showHousesTab) {
    return <HousingConversionPrompt />;
  }

  return (
    <View style={styles.container}>
      <Tab.Navigator
        tabBar={(props) => (
          <View style={styles.customTabBar}>
            {props.state.routes.map((route, index) => {
              const { options } = props.descriptors[route.key];
              const label = options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

              const isFocused = props.state.index === index;

              const onPress = () => {
                const event = props.navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  props.navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  style={[
                    styles.customTabButton,
                    isFocused && styles.customTabButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.customTabLabel,
                      isFocused && styles.customTabLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      >
        {showRoommatesTab && (
          <Tab.Screen name="Roommates">
            {() => <RoommatesTab roommates={roommates} />}
          </Tab.Screen>
        )}
        {showHousesTab && (
          <Tab.Screen name="Houses">
            {() => <HousesTab listings={listings} isHousingOnly={isHousingOnly} />}
          </Tab.Screen>
        )}
      </Tab.Navigator>
    </View>
  );
}

function RoommatesTab({ roommates }: { roommates: User[] }) {
  const { currentUser, sendMessage } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedUsers, setSwipedUsers] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<{ id: string; promptText: string; answer: string } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const cardSwipeTriggerRef = useRef<((direction: 'left' | 'right') => void) | null>(null);

  if (roommates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#E8D5C4" />
        <Text style={styles.emptyText}>No roommates found</Text>
        <Text style={styles.emptySubtext}>Check back later for new matches!</Text>
      </View>
    );
  }

  const currentRoommate = roommates[currentIndex];
  if (!currentRoommate) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#FF6B35" />
        <Text style={styles.emptyText}>You've seen everyone!</Text>
        <Text style={styles.emptySubtext}>Check back later for new matches</Text>
      </View>
    );
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    // Trigger card animation if available
    if (cardSwipeTriggerRef.current) {
      cardSwipeTriggerRef.current(direction);
    } else {
      // Fallback: just move to next
      setSwipedUsers(new Set([...swipedUsers, currentRoommate.id]));
      setIsExpanded(false);
      if (currentIndex < roommates.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const onCardSwipeComplete = (direction: 'left' | 'right') => {
    // This is called after animation completes
    setSwipedUsers(new Set([...swipedUsers, currentRoommate.id]));
    setIsExpanded(false);
    if (currentIndex < roommates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleChat = () => {
    setShowMessageModal(true);
  };

  const handlePromptPress = (prompt: { id: string; promptText: string; answer: string }) => {
    setSelectedPrompt(prompt);
    setShowPromptModal(true);
  };

  const handleSendPromptResponse = async () => {
    if (!messageText.trim() || !currentUser || !selectedPrompt) return;
    
    setIsSendingMessage(true);
    try {
      // Send message with prompt context
      const messageWithPrompt = `${selectedPrompt.promptText}\n\n${selectedPrompt.answer}\n\n${messageText.trim()}`;
      await sendMessage(currentUser.id, currentRoommate.id, messageWithPrompt);
      setMessageText('');
      setShowPromptModal(false);
      setSelectedPrompt(null);
      setIsExpanded(false);
      
      // Auto-swipe right after sending message
      setTimeout(() => {
        handleSwipe('right');
      }, 100);
    } catch (error) {
      console.error('Error sending prompt response:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser) return;
    
    setIsSendingMessage(true);
    try {
      await sendMessage(currentUser.id, currentRoommate.id, messageText.trim());
      setMessageText('');
      setShowMessageModal(false);
      setIsExpanded(false);
      
      // Auto-swipe right after sending message
      setTimeout(() => {
        handleSwipe('right');
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <View style={styles.swipeContainer}>
      <RoommateCard
        user={currentRoommate}
        onSwipeLeft={() => onCardSwipeComplete('left')}
        onSwipeRight={() => onCardSwipeComplete('right')}
        isExpanded={isExpanded}
        onExpand={() => setIsExpanded(true)}
        onSwipeTrigger={(triggerFn) => {
          cardSwipeTriggerRef.current = triggerFn;
        }}
        onPromptPress={handlePromptPress}
      />
      
      {/* Expanded Profile Modal */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.expandedContainer}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.expandedBackButton}
            onPress={() => setIsExpanded(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#6F4E37" />
          </TouchableOpacity>
          <ScrollView style={styles.expandedScrollView} showsVerticalScrollIndicator={false}>
            {/* Photo */}
            <View style={styles.expandedPhotoContainer}>
              {currentRoommate.profilePicture ? (
                <Image source={{ uri: currentRoommate.profilePicture }} style={styles.expandedPhoto} resizeMode="cover" />
              ) : (
                <View style={styles.expandedPhotoPlaceholder}>
                  <Ionicons name="person" size={120} color="#E8D5C4" />
                </View>
              )}
            </View>

            {/* Info Section */}
            <View style={styles.expandedInfoContainer}>
              <View style={styles.expandedHeader}>
                <Text style={styles.expandedName}>{currentRoommate.name}</Text>
                <Text style={styles.expandedAge}>{currentRoommate.age}</Text>
              </View>

              <View style={styles.expandedDetails}>
                <View style={styles.expandedDetailRow}>
                  <Ionicons name="briefcase" size={20} color="#6F4E37" />
                  <Text style={styles.expandedDetailText}>{currentRoommate.job}</Text>
                </View>
                {currentRoommate.university && currentRoommate.university !== 'N/A' && (
                  <View style={styles.expandedDetailRow}>
                    <Ionicons name="school" size={20} color="#6F4E37" />
                    <Text style={styles.expandedDetailText}>{currentRoommate.university}</Text>
                  </View>
                )}
                <View style={styles.expandedDetailRow}>
                  <Ionicons name="location" size={20} color="#6F4E37" />
                  <Text style={styles.expandedDetailText}>{currentRoommate.location}</Text>
                </View>
              </View>

              {currentRoommate.bio && (
                <View style={styles.expandedBioSection}>
                  <Text style={styles.expandedBioLabel}>About</Text>
                  <Text style={styles.expandedBio}>{currentRoommate.bio}</Text>
                </View>
              )}

              {/* Prompts Section */}
              {currentRoommate.prompts && currentRoommate.prompts.length > 0 && (
                <View style={styles.expandedPromptsSection}>
                  <Text style={styles.expandedPromptsLabel}>Prompts</Text>
                  {currentRoommate.prompts.map((prompt) => (
                    <TouchableOpacity
                      key={prompt.id}
                      style={styles.expandedPromptCard}
                      onPress={() => {
                        setIsExpanded(false);
                        handlePromptPress(prompt);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.expandedPromptQuestion}>{prompt.promptText}</Text>
                      <Text style={styles.expandedPromptAnswer}>{prompt.answer}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.expandedPreferences}>
                <Text style={styles.expandedPreferencesLabel}>Preferences</Text>
                <View style={styles.expandedPreferencesGrid}>
                  <View style={styles.expandedPreferenceItem}>
                    <Text style={styles.expandedPreferenceLabel}>Smoking</Text>
                    <Text style={styles.expandedPreferenceValue}>{currentRoommate.smoking}</Text>
                  </View>
                  <View style={styles.expandedPreferenceItem}>
                    <Text style={styles.expandedPreferenceLabel}>Drinking</Text>
                    <Text style={styles.expandedPreferenceValue}>{currentRoommate.drinking}</Text>
                  </View>
                  <View style={styles.expandedPreferenceItem}>
                    <Text style={styles.expandedPreferenceLabel}>Pets</Text>
                    <Text style={styles.expandedPreferenceValue}>{currentRoommate.pets || 'N/A'}</Text>
                  </View>
                  <View style={styles.expandedPreferenceItem}>
                    <Text style={styles.expandedPreferenceLabel}>Sleep Schedule</Text>
                    <Text style={styles.expandedPreferenceValue}>{currentRoommate.nightOwl}</Text>
                  </View>
                </View>
              </View>

              {currentRoommate.religion && (
                <View style={styles.expandedDetailRow}>
                  <Ionicons name="heart" size={20} color="#6F4E37" />
                  <Text style={styles.expandedDetailText}>Religion: {currentRoommate.religion}</Text>
                </View>
              )}

              {currentRoommate.hometown && (
                <View style={styles.expandedDetailRow}>
                  <Ionicons name="home" size={20} color="#6F4E37" />
                  <Text style={styles.expandedDetailText}>From: {currentRoommate.hometown}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Floating Action Buttons - Always visible */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={[styles.floatingButton, styles.dislikeButton]}
          onPress={() => handleSwipe('left')}
        >
          <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.floatingButton, styles.chatButton]}
          onPress={handleChat}
        >
          <Ionicons name="chatbubble" size={24} color="#6F4E37" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.floatingButton, styles.likeButton]}
          onPress={() => handleSwipe('right')}
        >
          <Ionicons name="heart" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Prompt Response Modal - Hinge Style */}
      <Modal
        visible={showPromptModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPromptModal(false);
          setSelectedPrompt(null);
        }}
      >
        <View style={styles.promptModalContainer}>
          <TouchableOpacity
            style={styles.promptModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowPromptModal(false);
              setSelectedPrompt(null);
            }}
          />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.promptModalContent}
          >
            {/* User Name at Top */}
            <View style={styles.promptModalHeader}>
              <Text style={styles.promptModalUserName}>{currentRoommate.name}</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowPromptModal(false);
                  setSelectedPrompt(null);
                }}
              >
                <Ionicons name="close" size={24} color="#6F4E37" />
              </TouchableOpacity>
            </View>

            {/* Prompt Card */}
            {selectedPrompt && (
              <View style={styles.promptModalCard}>
                <Text style={styles.promptModalQuestion}>{selectedPrompt.promptText}</Text>
                <Text style={styles.promptModalAnswer}>{selectedPrompt.answer}</Text>
              </View>
            )}

            {/* Comment Bubble */}
            <View style={styles.promptModalCommentBubble}>
              <Text style={styles.promptModalCommentText}>Add a comment</Text>
            </View>

            {/* Input Field */}
            <TextInput
              style={styles.promptModalInput}
              placeholder="Add a comment"
              placeholderTextColor="#A68B7B"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              autoFocus
            />

            {/* Action Buttons */}
            <View style={styles.promptModalActions}>
              <TouchableOpacity
                style={styles.promptModalCancelButton}
                onPress={() => {
                  setShowPromptModal(false);
                  setSelectedPrompt(null);
                  setMessageText('');
                }}
              >
                <Text style={styles.promptModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptModalMessageButton}
                onPress={() => {
                  setShowPromptModal(false);
                  setSelectedPrompt(null);
                  setShowMessageModal(true);
                }}
              >
                <Text style={styles.promptModalMessageText}>Send Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.promptModalSendButton,
                  (!messageText.trim() || isSendingMessage) && styles.promptModalSendButtonDisabled
                ]}
                onPress={handleSendPromptResponse}
                disabled={!messageText.trim() || isSendingMessage}
              >
                {isSendingMessage ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.promptModalSendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Regular Message Modal */}
      <Modal
        visible={showMessageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.messageModalContainer}>
          <TouchableOpacity
            style={styles.messageModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowMessageModal(false)}
          />
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.messageModalContent}
            >
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.messageModalCloseButton}
                onPress={() => setShowMessageModal(false)}
              >
                <Ionicons name="close" size={24} color="#6F4E37" />
              </TouchableOpacity>

              {/* Profile Picture and Name on Left */}
              <View style={styles.messageModalLeftSection}>
                <View style={styles.messageModalAvatarContainer}>
                  {currentRoommate.profilePicture ? (
                    <Image
                      source={{ uri: currentRoommate.profilePicture }}
                      style={styles.messageModalAvatarCircle}
                    />
                  ) : (
                    <View style={styles.messageModalAvatarCirclePlaceholder}>
                      <Ionicons name="person" size={32} color="#E8D5C4" />
                    </View>
                  )}
                </View>
                <Text style={styles.messageModalUserNameBelow} numberOfLines={1}>
                  {currentRoommate.name}
                </Text>
              </View>

              {/* Message Input on Right */}
              <View style={styles.messageModalRightSection}>
                <TextInput
                  style={styles.messageModalInputBox}
                  placeholder="type your message"
                  placeholderTextColor="#A68B7B"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={500}
                  autoFocus
                />
              </View>

              {/* Send Button on Bottom */}
              <TouchableOpacity
                style={[
                  styles.messageModalSendButtonBottom,
                  (!messageText.trim() || isSendingMessage) && styles.messageModalSendButtonBottomDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || isSendingMessage}
              >
                {isSendingMessage ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.messageModalSendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function HousingConversionPrompt() {
  const { currentUser, updateUser } = useUser();
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = async () => {
    if (!currentUser) return;
    setIsConverting(true);
    try {
      await updateUser(currentUser.id, { lookingFor: 'both' });
      Alert.alert('Success', 'You can now swipe on both roommates and housing!');
    } catch (error) {
      console.error('Error converting profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <View style={styles.conversionContainer}>
      <Ionicons name="home-outline" size={80} color="#FF6B35" />
      <Text style={styles.conversionTitle}>Want to start looking for housing?</Text>
      <Text style={styles.conversionText}>
        Unlock access to browse listings and use the map to find your perfect place!
      </Text>
      <TouchableOpacity
        style={styles.conversionButton}
        onPress={handleConvert}
        disabled={isConverting}
      >
        {isConverting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.conversionButtonText}>Yes, let's do it!</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.conversionButtonSecondary}
        onPress={() => {}}
        disabled={isConverting}
      >
        <Text style={styles.conversionButtonSecondaryText}>Not right now</Text>
      </TouchableOpacity>
    </View>
  );
}

function RoommateConversionPrompt({ onConvert, onDismiss }: { onConvert: () => void; onDismiss: () => void }) {
  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.conversionModalOverlay}>
        <View style={styles.conversionModalContent}>
          <Ionicons name="people-outline" size={64} color="#FF6B35" />
          <Text style={styles.conversionModalTitle}>Want to start looking for roommates?</Text>
          <Text style={styles.conversionModalText}>
            You've swiped through many listings! Start looking for roommates to find your perfect match.
          </Text>
          <View style={styles.conversionModalButtons}>
            <TouchableOpacity
              style={styles.conversionModalButton}
              onPress={onConvert}
            >
              <Text style={styles.conversionModalButtonText}>Yes, let's do it!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.conversionModalButtonSecondary}
              onPress={onDismiss}
            >
              <Text style={styles.conversionModalButtonSecondaryText}>Not right now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function HousesTab({ listings, isHousingOnly = false }: { listings: Listing[]; isHousingOnly?: boolean }) {
  const { currentUser, sendMessage, users, updateUser, addLikedListing, getUserById } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedListings, setSwipedListings] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showRoommatePrompt, setShowRoommatePrompt] = useState(false);
  const [totalSwipes, setTotalSwipes] = useState(0);
  const cardSwipeTriggerRef = useRef<((direction: 'left' | 'right') => void) | null>(null);

  if (listings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="home-outline" size={64} color="#E8D5C4" />
        <Text style={styles.emptyText}>No listings found</Text>
        <Text style={styles.emptySubtext}>Check back later for new properties!</Text>
      </View>
    );
  }

  const currentListing = listings[currentIndex];
  if (!currentListing) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#FF6B35" />
        <Text style={styles.emptyText}>You've seen all listings!</Text>
        <Text style={styles.emptySubtext}>Check back later for new properties</Text>
      </View>
    );
  }

  const handleSwipe = async (direction: 'left' | 'right') => {
    // Trigger card animation if available
    if (cardSwipeTriggerRef.current) {
      cardSwipeTriggerRef.current(direction);
    } else {
      // Fallback: just move to next
      setSwipedListings(new Set([...swipedListings, currentListing.id]));
      setIsExpanded(false);
      if (direction === 'right') {
        await addLikedListing(currentListing.id);
      }
      
      // Track swipes for housing-only users
      if (isHousingOnly) {
        const newTotalSwipes = totalSwipes + 1;
        setTotalSwipes(newTotalSwipes);
        
        // Show prompt after 50 swipes or when all listings are swiped
        if (newTotalSwipes >= 50 || currentIndex >= listings.length - 1) {
          setShowRoommatePrompt(true);
        }
      }
      
      if (currentIndex < listings.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const onCardSwipeComplete = async (direction: 'left' | 'right') => {
    // This is called after animation completes
    setSwipedListings(new Set([...swipedListings, currentListing.id]));
    setIsExpanded(false);
    if (direction === 'right') {
      await addLikedListing(currentListing.id);
    }
    
    // Track swipes for housing-only users
    if (isHousingOnly) {
      const newTotalSwipes = totalSwipes + 1;
      setTotalSwipes(newTotalSwipes);
      
      // Show prompt after 50 swipes or when all listings are swiped
      if (newTotalSwipes >= 50 || currentIndex >= listings.length - 1) {
        setShowRoommatePrompt(true);
      }
    }
    
    if (currentIndex < listings.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleConvertToBoth = async () => {
    if (!currentUser) return;
    try {
      await updateUser(currentUser.id, { lookingFor: 'both' });
      setShowRoommatePrompt(false);
      Alert.alert('Success', 'You can now swipe on both roommates and housing!');
    } catch (error) {
      console.error('Error converting profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  // Check if listing has an owner (user-created listings can be messaged, external cannot)
  const hasOwner = currentListing.ownerId && currentListing.ownerId !== '';

  const handleChat = () => {
    // Check if this is an external listing (no ownerId)
    if (!hasOwner) {
      Alert.alert(
        'External Listing',
        'This listing is from an external source and cannot be messaged directly. You can still like it to save it for later!',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // For user-created listings, find the owner
    console.log('💬 [Chat] Looking for listing owner:', currentListing.ownerId);
    let owner = users.find(u => u.id === currentListing.ownerId);
    
    if (!owner && currentListing.ownerId) {
      owner = getUserById(currentListing.ownerId);
    }
    
    console.log('💬 [Chat] Found owner:', owner ? { id: owner.id, name: owner.name } : 'NOT FOUND');
    
    if (!owner || !currentUser) {
      Alert.alert('Error', `Unable to find listing owner. The owner may not be in the system.`);
      return;
    }
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser) return;
    
    console.log('💬 [Chat] Sending message for listing:', currentListing.id);
    console.log('💬 [Chat] Owner ID:', currentListing.ownerId);
    
    // Try to get owner from users array or by ID
    let owner = users.find(u => u.id === currentListing.ownerId);
    if (!owner && currentListing.ownerId) {
      owner = getUserById(currentListing.ownerId);
    }
    
    if (!owner) {
      console.error('💬 [Chat] Owner not found. Listing ownerId:', currentListing.ownerId);
      Alert.alert('Error', `Unable to find listing owner (ID: ${currentListing.ownerId}). The owner may not be in the system.`);
      return;
    }
    
    console.log('💬 [Chat] Sending message to owner:', owner.name);
    
    setIsSendingMessage(true);
    try {
      await sendMessage(currentUser.id, owner.id, messageText.trim());
      setMessageText('');
      setShowMessageModal(false);
      setIsExpanded(false);
      
      // Auto-swipe right after sending message
      setTimeout(() => {
        handleSwipe('right');
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <View style={styles.swipeContainer}>
      {showRoommatePrompt && (
        <RoommateConversionPrompt
          onConvert={handleConvertToBoth}
          onDismiss={() => setShowRoommatePrompt(false)}
        />
      )}
      <ListingCard
        listing={currentListing}
        onSwipeLeft={() => onCardSwipeComplete('left')}
        onSwipeRight={() => onCardSwipeComplete('right')}
        isExpanded={isExpanded}
        onExpand={() => setIsExpanded(true)}
        onSwipeTrigger={(triggerFn) => {
          cardSwipeTriggerRef.current = triggerFn;
        }}
      />

      {/* Expanded Listing Modal */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.expandedContainer}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.expandedBackButton}
            onPress={() => setIsExpanded(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#6F4E37" />
          </TouchableOpacity>
          <ScrollView style={styles.expandedScrollView} showsVerticalScrollIndicator={false}>
            {/* Photo Gallery with Swipe Support */}
            <ExpandedPhotoGallery listing={currentListing} />

            {/* Info Section */}
            <View style={styles.expandedInfoContainer}>
              <View style={styles.expandedHeader}>
                <Text style={styles.expandedPrice}>${currentListing.price.toLocaleString()}</Text>
              </View>

              <View style={styles.expandedAddressSection}>
                <Text style={styles.expandedAddress}>{currentListing.address}</Text>
                <Text style={styles.expandedCityState}>
                  {currentListing.city}, {currentListing.state} {currentListing.zipCode}
                </Text>
              </View>

              {currentListing.bedrooms && currentListing.bathrooms && (
                <View style={styles.expandedDetailsRow}>
                  <View style={styles.expandedDetailItem}>
                    <Ionicons name="bed" size={20} color="#6F4E37" />
                    <Text style={styles.expandedDetailText}>{currentListing.bedrooms} bed</Text>
                  </View>
                  <View style={styles.expandedDetailItem}>
                    <Ionicons name="water" size={20} color="#6F4E37" />
                    <Text style={styles.expandedDetailText}>{currentListing.bathrooms} bath</Text>
                  </View>
                  {currentListing.squareFeet && (
                    <View style={styles.expandedDetailItem}>
                      <Ionicons name="square" size={20} color="#6F4E37" />
                      <Text style={styles.expandedDetailText}>{currentListing.squareFeet} sq ft</Text>
                    </View>
                  )}
                </View>
              )}

              {currentListing.description && (
                <View style={styles.expandedDescriptionSection}>
                  <Text style={styles.expandedDescriptionLabel}>About This Place</Text>
                  <Text style={styles.expandedDescription}>
                    {currentListing.description}
                  </Text>
                </View>
              )}

              {currentListing.availableDate && (
                <View style={styles.expandedDetailRow}>
                  <Ionicons name="calendar" size={20} color="#6F4E37" />
                  <Text style={styles.expandedDetailText}>
                    Available: {new Date(currentListing.availableDate).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {/* Contact Section */}
              <View style={styles.expandedContactSection}>
                {hasOwner ? (
                  <TouchableOpacity
                    style={styles.expandedMessageButton}
                    onPress={() => {
                      setIsExpanded(false);
                      handleChat();
                    }}
                  >
                    <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                    <Text style={styles.expandedMessageButtonText}>Message Owner</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.expandedExternalListingNotice}>
                    <Ionicons name="information-circle" size={24} color="#FF6B35" />
                    <Text style={styles.expandedExternalListingTitle}>External Listing</Text>
                    <Text style={styles.expandedExternalListingText}>
                      This listing is managed by an external agent. To contact them, please reach out through their website or contact information outside of this app.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Floating Action Buttons - Always visible */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={[styles.floatingButton, styles.dislikeButton]}
          onPress={() => handleSwipe('left')}
        >
          <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.floatingButton, 
            styles.chatButton,
            !hasOwner && styles.chatButtonDisabled
          ]}
          onPress={handleChat}
          disabled={!hasOwner}
        >
          <Ionicons 
            name="chatbubble" 
            size={24} 
            color={hasOwner ? "#6F4E37" : "#E8D5C4"} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.floatingButton, styles.likeButton]}
          onPress={() => handleSwipe('right')}
        >
          <Ionicons name="heart" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Message Modal */}
      {hasOwner && (
        <Modal
          visible={showMessageModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowMessageModal(false)}
        >
          <View style={styles.messageModalContainer}>
            <TouchableOpacity
              style={styles.messageModalBackdrop}
              activeOpacity={1}
              onPress={() => setShowMessageModal(false)}
            />
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.messageModalContent}
            >
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.messageModalCloseButton}
                onPress={() => setShowMessageModal(false)}
              >
                <Ionicons name="close" size={24} color="#6F4E37" />
              </TouchableOpacity>

              {/* Profile Picture and Name on Left */}
              <View style={styles.messageModalLeftSection}>
                <View style={styles.messageModalAvatarContainer}>
                  {(() => {
                    const owner = users.find(u => u.id === currentListing.ownerId) || getUserById(currentListing.ownerId);
                    return owner?.profilePicture ? (
                      <Image
                        source={{ uri: owner.profilePicture }}
                        style={styles.messageModalAvatarCircle}
                      />
                    ) : (
                      <View style={styles.messageModalAvatarCirclePlaceholder}>
                        <Ionicons name="person" size={32} color="#E8D5C4" />
                      </View>
                    );
                  })()}
                </View>
                <Text style={styles.messageModalUserNameBelow} numberOfLines={1}>
                  {(() => {
                    const owner = users.find(u => u.id === currentListing.ownerId) || getUserById(currentListing.ownerId);
                    return owner?.name || 'Listing Owner';
                  })()}
                </Text>
              </View>

              {/* Message Input on Right */}
              <View style={styles.messageModalRightSection}>
                <TextInput
                  style={styles.messageModalInputBox}
                  placeholder="type your message"
                  placeholderTextColor="#A68B7B"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={500}
                  autoFocus
                />
              </View>

              {/* Send Button on Bottom */}
              <TouchableOpacity
                style={[
                  styles.messageModalSendButtonBottom,
                  (!messageText.trim() || isSendingMessage) && styles.messageModalSendButtonBottomDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || isSendingMessage}
              >
                {isSendingMessage ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.messageModalSendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  swipeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  noUserText: {
    fontSize: 18,
    color: '#6F4E37',
    textAlign: 'center',
    marginTop: 100,
  },
  incompleteProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  incompleteProfileTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6F4E37',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  incompleteProfileText: {
    fontSize: 16,
    color: '#6F4E37',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  incompleteProfileSubtext: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dislikeButton: {
    backgroundColor: '#F44336',
  },
  chatButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  chatButtonDisabled: {
    opacity: 0.5,
    borderColor: '#E8D5C4',
  },
  likeButton: {
    backgroundColor: '#4CAF50',
  },
  cardTouchable: {
    width: '100%',
    height: '100%',
  },
  expandedContainer: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  expandedBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expandedScrollView: {
    flex: 1,
  },
  expandedPhotoContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#E8D5C4',
    position: 'relative',
    overflow: 'hidden',
  },
  expandedPhotoGallery: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
  },
  expandedPhoto: {
    width: Dimensions.get('window').width,
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  expandedPhotoNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  expandedPhotoNavButtonLeft: {
    left: 10,
  },
  expandedPhotoNavButtonRight: {
    right: 10,
  },
  expandedPhotoIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  expandedPhotoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  expandedPhotoIndicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  expandedPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8D5C4',
  },
  expandedPhotoPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#A68B7B',
  },
  expandedInfoContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  expandedHeader: {
    marginBottom: 16,
  },
  expandedName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6F4E37',
    marginRight: 12,
  },
  expandedAge: {
    fontSize: 28,
    color: '#A68B7B',
  },
  expandedPrice: {
    fontSize: 40,
    fontWeight: '700',
    color: '#6F4E37',
  },
  expandedDetails: {
    marginBottom: 24,
  },
  expandedDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  expandedDetailText: {
    fontSize: 18,
    color: '#6F4E37',
  },
  expandedBioSection: {
    marginBottom: 24,
  },
  expandedBioLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 12,
  },
  expandedBio: {
    fontSize: 18,
    color: '#6F4E37',
    lineHeight: 28,
  },
  expandedPromptsSection: {
    marginBottom: 24,
  },
  expandedPromptsLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 12,
  },
  expandedPromptCard: {
    backgroundColor: '#FFF5E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  expandedPromptQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
  },
  expandedPromptAnswer: {
    fontSize: 16,
    color: '#6F4E37',
    lineHeight: 24,
  },
  expandedPreferences: {
    marginBottom: 24,
  },
  expandedPreferencesLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 16,
  },
  expandedPreferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  expandedPreferenceItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  expandedPreferenceLabel: {
    fontSize: 14,
    color: '#A68B7B',
    marginBottom: 6,
  },
  expandedPreferenceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F4E37',
  },
  expandedAddressSection: {
    marginBottom: 20,
  },
  expandedAddress: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
  },
  expandedCityState: {
    fontSize: 20,
    color: '#A68B7B',
  },
  expandedDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  expandedDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  expandedDescriptionSection: {
    marginBottom: 24,
  },
  expandedDescriptionLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  expandedContactSection: {
    marginTop: 24,
    marginBottom: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E8D5C4',
  },
  expandedMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  expandedMessageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  expandedExternalListingNotice: {
    backgroundColor: '#FFF5E1',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  expandedExternalListingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6F4E37',
    marginTop: 12,
    marginBottom: 8,
  },
  expandedExternalListingText: {
    fontSize: 14,
    color: '#6F4E37',
    textAlign: 'center',
    lineHeight: 20,
  },
  expandedDescriptionLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 12,
  },
  expandedDescription: {
    fontSize: 18,
    color: '#6F4E37',
    lineHeight: 28,
  },
  messageModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  messageModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  messageModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    maxHeight: '35%',
    minHeight: 250,
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 1001,
  },
  messageModalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 5,
  },
  messageModalLeftSection: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  messageModalAvatarContainer: {
    marginBottom: 8,
  },
  messageModalAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  messageModalAvatarCirclePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8D5C4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  messageModalUserNameBelow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6F4E37',
    textAlign: 'center',
    marginTop: 4,
  },
  messageModalRightSection: {
    flex: 1,
    marginTop: 40,
  },
  messageModalInputBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
    maxHeight: 120,
    fontSize: 16,
    color: '#6F4E37',
    textAlignVertical: 'top',
  },
  messageModalSendButtonBottom: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageModalSendButtonBottomDisabled: {
    backgroundColor: '#E8D5C4',
  },
  messageModalSendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  conversionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FFF5E1',
  },
  conversionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6F4E37',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  conversionText: {
    fontSize: 16,
    color: '#A68B7B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  conversionButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  conversionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  conversionButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  conversionButtonSecondaryText: {
    color: '#A68B7B',
    fontSize: 16,
    fontWeight: '500',
  },
  conversionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  conversionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  conversionModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6F4E37',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  conversionModalText: {
    fontSize: 16,
    color: '#A68B7B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  conversionModalButtons: {
    width: '100%',
    gap: 12,
  },
  conversionModalButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  conversionModalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  conversionModalButtonSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  conversionModalButtonSecondaryText: {
    color: '#A68B7B',
    fontSize: 16,
    fontWeight: '500',
  },
  customTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF5E1',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  customTabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  customTabButtonActive: {
    backgroundColor: '#FF6B35',
  },
  customTabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A68B7B',
  },
  customTabLabelActive: {
    color: '#FFFFFF',
  },
  // Prompt Response Modal Styles (Hinge-style)
  promptModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  promptModalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  promptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  promptModalUserName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6F4E37',
  },
  promptModalCard: {
    backgroundColor: '#FFF5E1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  promptModalQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 12,
  },
  promptModalAnswer: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    lineHeight: 26,
  },
  promptModalCommentBubble: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  promptModalCommentText: {
    fontSize: 14,
    color: '#A68B7B',
    fontStyle: 'italic',
  },
  promptModalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
    maxHeight: 120,
    fontSize: 16,
    color: '#6F4E37',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  promptModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  promptModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A68B7B',
  },
  promptModalMessageButton: {
    flex: 1.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptModalMessageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  promptModalSendButton: {
    flex: 1.5,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptModalSendButtonDisabled: {
    backgroundColor: '#E8D5C4',
  },
  promptModalSendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

