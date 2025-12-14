import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreen from "./ProfileScreen";
import ChatScreen from "./ChatScreen";
import MapScreen from "./MapScreen";
import SwipeScreen from "./SwipeScreen";

const Tab = createBottomTabNavigator();

// Property type definition
interface Property {
  id: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  propertyType: string;
  status: string;
  availabilityType?: string;
  availabilityDates?: string;
  imageUrl: string;
  images?: string[];
  description: string;
  features?: string[];
  utilities?: string;
  petPolicy?: string;
  listingDate?: string;
  landlord?: {
    name: string;
    phone: string;
    email: string;
  };
}

function SearchScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<number>>(
    new Set()
  );
  const [showSaved, setShowSaved] = useState(false);

  // Change this to your computer's IP address if testing on a physical device
  // For example: 'http://192.168.1.5:3000'
  const API_URL = "http://localhost:3000";

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/properties`);

      if (!response.ok) {
        throw new Error("Failed to fetch properties");
      }

      const data = await response.json();
      setProperties(data);
    } catch (err) {
      setError("Failed to load properties. Make sure JSON Server is running!");
      console.error("Error loading properties:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveProperty = (propertyId: number) => {
    setSavedPropertyIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  };

  const displayedProperties = showSaved
    ? properties.filter((p) => savedPropertyIds.has(p.id))
    : properties;

  const renderProperty = ({ item }: { item: Property }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => {
        console.log("Property pressed:", item.id);
        setSelectedProperty(item);
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.propertyImage} />
      <TouchableOpacity
        style={styles.heartButton}
        onPress={() => toggleSaveProperty(item.id)}
      >
        <Ionicons
          name={savedPropertyIds.has(item.id) ? "heart" : "heart-outline"}
          size={24}
          color="#FF6B35"
        />
      </TouchableOpacity>
      <View style={styles.propertyInfo}>
        <Text style={styles.price}>${item.price.toLocaleString()}</Text>
        <Text style={styles.address}>{item.address}</Text>
        <Text style={styles.location}>
          {item.city}, {item.state} {item.zipCode}
        </Text>
        <View style={styles.detailsRow}>
          <Text style={styles.details}>{item.beds} beds</Text>
          <Text style={styles.details}> • </Text>
          <Text style={styles.details}>{item.baths} baths</Text>
          <Text style={styles.details}> • </Text>
          <Text style={styles.details}>{item.sqft.toLocaleString()} sqft</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.screenContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screenContainer}>
        <Ionicons name="warning" size={48} color="#FF6B35" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProperties}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.searchContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {showSaved ? "Saved Properties" : "Properties for Sale"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {displayedProperties.length} listings
          </Text>
        </View>
        <TouchableOpacity
          style={styles.savedButton}
          onPress={() => setShowSaved(!showSaved)}
        >
          <Ionicons
            name={showSaved ? "close" : "heart"}
            size={24}
            color="#FF6B35"
          />
          <Text style={styles.savedButtonText}>
            {showSaved ? "All" : "Saved"}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={displayedProperties}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProperty}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          showSaved ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={64} color="#E8D5C4" />
              <Text style={styles.emptyStateText}>No saved properties yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the heart icon on any listing to save it
              </Text>
            </View>
          ) : null
        }
      />

      {/* Property Detail Modal */}
      <Modal
        visible={selectedProperty !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedProperty(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedProperty(null)}
            >
              <Ionicons name="close" size={24} color="#6F4E37" />
            </TouchableOpacity>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {selectedProperty && (
                <>
                  {/* Main Image */}
                  <Image
                    source={{ uri: selectedProperty.imageUrl }}
                    style={styles.modalImage}
                  />

                  {/* Property Info */}
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalPrice}>
                      ${selectedProperty.price.toLocaleString()}/mo
                    </Text>
                    <Text style={styles.modalAddress}>
                      {selectedProperty.address}
                    </Text>
                    <Text style={styles.modalLocation}>
                      {selectedProperty.city}, {selectedProperty.state}{" "}
                      {selectedProperty.zipCode}
                    </Text>

                    {/* Property Details */}
                    <View style={styles.modalDetailsRow}>
                      <View style={styles.modalDetailItem}>
                        <Ionicons
                          name="bed-outline"
                          size={20}
                          color="#6F4E37"
                        />
                        <Text style={styles.modalDetailText}>
                          {selectedProperty.beds} beds
                        </Text>
                      </View>
                      <View style={styles.modalDetailItem}>
                        <Ionicons
                          name="water-outline"
                          size={20}
                          color="#6F4E37"
                        />
                        <Text style={styles.modalDetailText}>
                          {selectedProperty.baths} baths
                        </Text>
                      </View>
                      <View style={styles.modalDetailItem}>
                        <Ionicons
                          name="resize-outline"
                          size={20}
                          color="#6F4E37"
                        />
                        <Text style={styles.modalDetailText}>
                          {selectedProperty.sqft.toLocaleString()} sqft
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View style={styles.modalStatusBadge}>
                      <Text style={styles.modalStatusText}>
                        {selectedProperty.status}
                      </Text>
                    </View>

                    {/* Availability */}
                    {selectedProperty.availabilityType && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>
                          Availability
                        </Text>
                        <Text style={styles.modalSectionText}>
                          {selectedProperty.availabilityType
                            .charAt(0)
                            .toUpperCase() +
                            selectedProperty.availabilityType.slice(1)}
                        </Text>
                        {selectedProperty.availabilityDates && (
                          <Text style={styles.modalSectionSubtext}>
                            {selectedProperty.availabilityDates}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Property Type & Year Built */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>
                        Property Type
                      </Text>
                      <Text style={styles.modalSectionText}>
                        {selectedProperty.propertyType}
                        {selectedProperty.yearBuilt &&
                          ` • Built in ${selectedProperty.yearBuilt}`}
                      </Text>
                    </View>

                    {/* Description */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Description</Text>
                      <Text style={styles.modalSectionText}>
                        {selectedProperty.description}
                      </Text>
                    </View>

                    {/* Features */}
                    {selectedProperty.features &&
                      selectedProperty.features.length > 0 && (
                        <View style={styles.modalSection}>
                          <Text style={styles.modalSectionTitle}>Features</Text>
                          {selectedProperty.features.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color="#FF6B35"
                              />
                              <Text style={styles.featureText}>{feature}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                    {/* Utilities */}
                    {selectedProperty.utilities && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Utilities</Text>
                        <Text style={styles.modalSectionText}>
                          {selectedProperty.utilities}
                        </Text>
                      </View>
                    )}

                    {/* Pet Policy */}
                    {selectedProperty.petPolicy && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Pet Policy</Text>
                        <Text style={styles.modalSectionText}>
                          {selectedProperty.petPolicy}
                        </Text>
                      </View>
                    )}

                    {/* Landlord Info */}
                    {selectedProperty.landlord && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>
                          Contact Information
                        </Text>
                        <View style={styles.landlordInfo}>
                          <View style={styles.landlordRow}>
                            <Ionicons
                              name="person-outline"
                              size={18}
                              color="#6F4E37"
                            />
                            <Text style={styles.landlordText}>
                              {selectedProperty.landlord.name}
                            </Text>
                          </View>
                          <View style={styles.landlordRow}>
                            <Ionicons
                              name="call-outline"
                              size={18}
                              color="#6F4E37"
                            />
                            <Text style={styles.landlordText}>
                              {selectedProperty.landlord.phone}
                            </Text>
                          </View>
                          <View style={styles.landlordRow}>
                            <Ionicons
                              name="mail-outline"
                              size={18}
                              color="#6F4E37"
                            />
                            <Text style={styles.landlordText}>
                              {selectedProperty.landlord.email}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Listing Date */}
                    {selectedProperty.listingDate && (
                      <View style={styles.modalSection}>
                        <Text style={styles.listingDateText}>
                          Listed on{" "}
                          {new Date(
                            selectedProperty.listingDate
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "search";

          if (route.name === "Search") {
            iconName = "search";
          } else if (route.name === "Map") {
            iconName = "map";
          } else if (route.name === "Swipe") {
            iconName = "heart";
          } else if (route.name === "Chat") {
            iconName = "chatbubble";
          } else if (route.name === "Profile") {
            iconName = "person";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#A68B7B",
        tabBarStyle: {
          backgroundColor: "#FFF5E1",
          borderTopColor: "#E8D5C4",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF5E1",
  },
  searchContainer: {
    flex: 1,
    backgroundColor: "#FFF5E1",
  },
  header: {
    padding: 20,
    paddingTop: 80,
    backgroundColor: "#FFF5E1",
    borderBottomWidth: 1,
    borderBottomColor: "#E8D5C4",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3D3027",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#A68B7B",
    marginTop: 4,
  },
  savedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  savedButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
  listContainer: {
    padding: 16,
  },
  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  propertyImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#E8D5C4",
  },
  heartButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  propertyInfo: {
    padding: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B35",
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3D3027",
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: "#A68B7B",
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  details: {
    fontSize: 14,
    color: "#3D3027",
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#A68B7B",
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#3D3027",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF5E1",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "90%",
    width: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalScrollView: {
    flex: 1,
    width: "100%",
  },
  modalImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#E8D5C4",
  },
  modalInfo: {
    padding: 20,
  },
  modalPrice: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FF6B35",
    marginBottom: 8,
  },
  modalAddress: {
    fontSize: 20,
    fontWeight: "600",
    color: "#3D3027",
    marginBottom: 4,
  },
  modalLocation: {
    fontSize: 16,
    color: "#A68B7B",
    marginBottom: 20,
  },
  modalDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
  },
  modalDetailItem: {
    alignItems: "center",
    gap: 4,
  },
  modalDetailText: {
    fontSize: 14,
    color: "#3D3027",
    fontWeight: "500",
  },
  modalStatusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3D3027",
    marginBottom: 8,
  },
  modalSectionText: {
    fontSize: 16,
    color: "#6F4E37",
    lineHeight: 24,
  },
  modalSectionSubtext: {
    fontSize: 14,
    color: "#A68B7B",
    lineHeight: 20,
    marginTop: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 15,
    color: "#6F4E37",
  },
  landlordInfo: {
    gap: 12,
  },
  landlordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  landlordText: {
    fontSize: 15,
    color: "#6F4E37",
  },
  listingDateText: {
    fontSize: 13,
    color: "#A68B7B",
    fontStyle: "italic",
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6F4E37",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#A68B7B",
    textAlign: "center",
  },
});
