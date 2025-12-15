import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import { RootStackParamList, User, UserPrompt } from "../types";
import { supabase } from "../lib/supabase";
import ProfileEditModal from "../components/ProfileEditModal";
import PromptsModal from "../components/PromptsModal";

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { currentUser, deleteUser, updateUser, setCurrentUser } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showPromptsModal, setShowPromptsModal] = useState(false);

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>No user data found</Text>
      </View>
    );
  }

  const getFieldValue = (field: string): any => {
    if (field === "budget") {
      return currentUser?.minBudget && currentUser?.maxBudget
        ? { minBudget: currentUser.minBudget, maxBudget: currentUser.maxBudget }
        : null;
    }
    if (field === "maxRoommates") {
      // Return number 0-6 as string
      if (typeof currentUser.maxRoommates === "number") {
        return String(Math.max(0, Math.min(6, currentUser.maxRoommates)));
      }
      if (typeof currentUser.maxRoommates === "string") {
        // Handle old "None" or "6+" values
        if (currentUser.maxRoommates === "None") {
          return "0";
        }
        if (currentUser.maxRoommates === "6+") {
          return "6";
        }
        const numValue = parseInt(currentUser.maxRoommates);
        return isNaN(numValue)
          ? "0"
          : String(Math.max(0, Math.min(6, numValue)));
      }
      return "0"; // Default to 0
    }
    if (field === "leaseDuration") {
      if (typeof currentUser.leaseDuration === "string") {
        return currentUser.leaseDuration;
      }
      return currentUser.leaseDuration
        ? `${currentUser.leaseDuration} month${
            currentUser.leaseDuration > 1 ? "s" : ""
          }`
        : "";
    }
    if (field === "friendliness" || field === "cleanliness") {
      const value = (currentUser as any)[field];
      // Return the raw number for the modal, not the formatted string
      return value !== null && value !== undefined ? value : 5;
    }
    if (field === "yearsExperience") {
      // Return the raw number for the modal (it will be formatted in display)
      return (currentUser as any)[field] || "";
    }
    return (currentUser as any)[field] || "";
  };

  const handleFieldPress = (field: string) => {
    setEditingField(field);
  };

  const handleSaveField = async (field: string, value: any) => {
    if (!currentUser) return;

    let updates: Partial<User> = {};

    if (field === "budget") {
      updates.minBudget = value.minBudget;
      updates.maxBudget = value.maxBudget;
    } else if (field === "roommateType") {
      updates.roommateType = value.toLowerCase() as
        | "roommates"
        | "suitemates"
        | "both";
    } else if (field === "spaceType") {
      // Handle array of space types
      if (Array.isArray(value)) {
        (updates as any).spaceType = value;
      } else {
        (updates as any).spaceType = value;
      }
    } else if (field === "maxRoommates") {
      updates.maxRoommates =
        typeof value === "number"
          ? value
          : typeof value === "string"
          ? parseInt(value) || 0
          : value;
    } else if (field === "leaseDuration") {
      updates.leaseDuration = value;
    } else {
      // For all other fields including friendliness, cleanliness, guestsAllowed
      (updates as any)[field] = value;
    }

    // Update user - this handles both local state and Supabase
    // updateUser in UserContext handles all the Supabase mapping
    await updateUser(currentUser.id, updates);

    setEditingField(null);
  };

  const getStatusText = () => {
    if (currentUser.userType === "homeowner") {
      return `Host in ${currentUser.location || "Unknown"}`;
    } else {
      const lookingForText =
        currentUser.lookingFor === "roommates"
          ? "Roommates"
          : currentUser.lookingFor === "housing"
          ? "Housing"
          : currentUser.lookingFor === "both"
          ? "Roommates + Housing"
          : "";
      return `Looking for ${lookingForText}`;
    }
  };

  const getRequiredFields = (): string[] => {
    // For homeowners: only personal info section (name, email, phone are from signup, so we check: age, race, gender, yearsExperience, hometown, location, bio)
    if (currentUser.userType === "homeowner") {
      return [
        "age",
        "race",
        "gender",
        "yearsExperience",
        "hometown",
        "location",
        "bio",
      ];
    }

    // For ALL searchers (roommates, housing, or both): same profile setup
    // The only difference is what they can swipe on in SwipeScreen, not their profile fields
    // Personal info: age, race, gender, university, hometown, location, bio
    // Lifestyle: smoking, drinking, drugs, nightOwl, religion, pets, friendliness (REQUIRED), cleanliness (REQUIRED), guestsAllowed (REQUIRED)
    // Housing preferences: maxRoommates, roommateType, preferredCity, spaceType, budget, leaseDuration
    const personalInfoFields = [
      "age",
      "race",
      "gender",
      "university",
      "hometown",
      "location",
      "bio",
    ];
    const lifestyleFields = [
      "smoking",
      "drinking",
      "drugs",
      "nightOwl",
      "religion",
      "pets",
      "friendliness",
      "cleanliness",
      "guestsAllowed",
    ];
    const housingFields = [
      "maxRoommates",
      "roommateType",
      "preferredCity",
      "spaceType",
      "budget",
      "leaseDuration",
    ];

    // All searchers have the same required fields regardless of lookingFor value
    return [...personalInfoFields, ...lifestyleFields, ...housingFields];
  };

  const requiredFields = getRequiredFields();
  const completedFields = requiredFields.filter((field) => {
    if (field === "budget") {
      return currentUser?.minBudget && currentUser?.maxBudget;
    }
    if (field === "spaceType") {
      // Handle array of space types
      const value = (currentUser as any)[field];
      return Array.isArray(value)
        ? value.length > 0
        : value && value.toString().trim() !== "";
    }
    if (field === "maxRoommates") {
      // Handle string "None" or number - accept 0 as valid
      const value = (currentUser as any)[field];
      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        (typeof value === "number" ? value >= 0 : true)
      );
    }
    if (field === "friendliness" || field === "cleanliness") {
      // These are numbers 1-10 (REQUIRED)
      const value = (currentUser as any)[field];
      return value !== null && value !== undefined && value >= 1 && value <= 10;
    }
    if (field === "guestsAllowed") {
      // This is required (REQUIRED)
      const value = (currentUser as any)[field];
      return value !== null && value !== undefined && value !== "";
    }
    const value = (currentUser as any)[field];
    // Check for empty strings, null, undefined, and empty arrays
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    const stringValue = value.toString().trim();
    return (
      stringValue !== "" &&
      stringValue !== "null" &&
      stringValue !== "undefined"
    );
  });

  // DEBUG: Log profile completeness details
  const missingFields = requiredFields.filter((field) => {
    if (field === "budget") {
      return !(currentUser?.minBudget && currentUser?.maxBudget);
    }
    if (field === "spaceType") {
      const value = (currentUser as any)[field];
      return !(Array.isArray(value)
        ? value.length > 0
        : value && value.toString().trim() !== "");
    }
    if (field === "maxRoommates") {
      const value = (currentUser as any)[field];
      // Accept 0 as valid, only reject null/undefined/empty string
      return (
        value === null ||
        value === undefined ||
        value === "" ||
        (typeof value === "number" && value < 0)
      );
    }
    if (field === "friendliness" || field === "cleanliness") {
      const value = (currentUser as any)[field];
      return value === null || value === undefined || value < 1 || value > 10;
    }
    if (field === "guestsAllowed") {
      const value = (currentUser as any)[field];
      return value === null || value === undefined || value === "";
    }
    const value = (currentUser as any)[field];
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    const stringValue = value.toString().trim();
    return (
      stringValue === "" ||
      stringValue === "null" ||
      stringValue === "undefined"
    );
  });

  console.log("=== PROFILE COMPLETENESS DEBUG ===");
  console.log("User Type:", currentUser.userType);
  console.log("Looking For:", currentUser.lookingFor);
  console.log("Total Required Fields:", requiredFields.length);
  console.log("Required Fields:", requiredFields);
  console.log("Completed Fields Count:", completedFields.length);
  console.log("Completed Fields:", completedFields);
  console.log("Missing Fields:", missingFields);
  console.log(
    "Missing Fields Values:",
    missingFields.map((f) => ({ field: f, value: (currentUser as any)[f] }))
  );
  console.log(
    "Profile Complete:",
    completedFields.length === requiredFields.length
  );
  console.log(
    "Completion Percentage:",
    requiredFields.length > 0
      ? completedFields.length === requiredFields.length
        ? 100
        : Math.round((completedFields.length / requiredFields.length) * 100)
      : 100
  );
  console.log("===================================");

  // Check if all required fields are complete (for swiping)
  const isProfileComplete = completedFields.length === requiredFields.length;

  // Check optional fields (prompts, job, lifestyle, housing preferences)
  const hasOptionalFields = () => {
    // Prompts are optional, check if any exist
    const hasPrompts = currentUser.prompts && currentUser.prompts.length > 0;
    // Job is optional
    const hasJob = currentUser.jobRole || currentUser.jobPlace;
    return hasPrompts || hasJob;
  };

  // Calculate percentage based on required fields only
  const profileCompletionPercentage =
    requiredFields.length > 0
      ? completedFields.length === requiredFields.length
        ? 100
        : Math.round((completedFields.length / requiredFields.length) * 100)
      : 100;

  const renderFieldCard = (
    label: string,
    field: string,
    value: any,
    icon: string,
    required: boolean = false
  ) => {
    const isEmpty = !value;
    const displayValue = value || (required ? "Required" : "Optional");

    return (
      <TouchableOpacity
        style={[
          styles.fieldCard,
          isEmpty && required && styles.fieldCardRequired,
        ]}
        onPress={() => handleFieldPress(field)}
        activeOpacity={0.7}
      >
        <View style={styles.fieldCardContent}>
          <View style={styles.fieldIconContainer}>
            <Ionicons
              name={icon as any}
              size={24}
              color={isEmpty && required ? "#FF6B35" : "#6F4E37"}
            />
          </View>
          <View style={styles.fieldTextContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text
              style={[styles.fieldValue, isEmpty && styles.fieldValueEmpty]}
            >
              {displayValue}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#A68B7B" />
      </TouchableOpacity>
    );
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log Out",
        onPress: async () => {
          try {
            // Clear current user data
            await setCurrentUser(null);
            // Reset navigation to Introduction screen (sign up/log in stage)
            // Use navigation.getParent() to access root navigator if needed
            const rootNavigation = navigation.getParent() || navigation;
            rootNavigation.reset({
              index: 0,
              routes: [{ name: "Introduction" }],
            });
          } catch (error) {
            console.error("Error logging out:", error);
            // Still navigate even if there's an error
            const rootNavigation = navigation.getParent() || navigation;
            rootNavigation.reset({
              index: 0,
              routes: [{ name: "Introduction" }],
            });
          }
        },
      },
    ]);
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      "Delete Profile",
      "Are you sure you want to delete your profile? This action cannot be undone and will remove all your data.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!currentUser) return;

            setIsDeleting(true);
            try {
              await supabase.from("users").delete().eq("id", currentUser.id);
              await supabase
                .from("messages")
                .delete()
                .or(
                  `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
                );
              await supabase
                .from("conversations")
                .delete()
                .contains("participants", [currentUser.id]);
              await supabase
                .from("swipes")
                .delete()
                .or(
                  `swiper_id.eq.${currentUser.id},swiped_id.eq.${currentUser.id}`
                );
              await supabase
                .from("matches")
                .delete()
                .or(
                  `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
                );

              await deleteUser(currentUser.id);

              navigation.reset({
                index: 0,
                routes: [{ name: "SignUp" }],
              });
            } catch (error) {
              console.error("Error deleting profile:", error);
              Alert.alert(
                "Error",
                "Failed to delete profile. Please try again."
              );
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: 50 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Completeness Tracker */}
        <View style={styles.completenessTracker}>
          <View style={styles.completenessHeader}>
            <Text style={styles.completenessLabel}>Profile Completeness</Text>
            <Text style={styles.completenessPercentage}>
              {profileCompletionPercentage}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${profileCompletionPercentage}%` },
              ]}
            />
          </View>
        </View>

        {/* Header with Profile Picture */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profilePicButton}
            onPress={() => handleFieldPress("profilePicture")}
          >
            {currentUser.profilePicture ? (
              <Image
                source={{ uri: currentUser.profilePicture }}
                style={styles.profilePic}
              />
            ) : (
              <View style={styles.profilePicPlaceholder}>
                <Ionicons name="person" size={40} color="#A68B7B" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color="#FFF5E1" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.name}>
              {currentUser.name}
              {currentUser.age ? `, ${currentUser.age}` : ""}
            </Text>
            <Text style={styles.status}>{getStatusText()}</Text>
            {currentUser.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#A68B7B" />
                <Text style={styles.location}>{currentUser.location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Completion Banner - Only show if profile is not complete */}
        {!isProfileComplete && (
          <View style={styles.completionBanner}>
            <Ionicons name="information-circle" size={20} color="#FF6B35" />
            <Text style={styles.completionText}>
              Complete your profile to start swiping
            </Text>
          </View>
        )}

        {/* Bio Section */}
        <TouchableOpacity
          style={styles.bioCard}
          onPress={() => handleFieldPress("bio")}
          activeOpacity={0.7}
        >
          <View style={styles.bioHeader}>
            <Ionicons name="document-text-outline" size={20} color="#6F4E37" />
            <Text style={styles.bioLabel}>About Me</Text>
          </View>
          <Text
            style={[styles.bioText, !currentUser.bio && styles.bioTextEmpty]}
          >
            {currentUser.bio || "Tap to add your bio (minimum 10 words)"}
          </Text>
        </TouchableOpacity>

        {/* Prompts Section - Only for searchers */}
        {currentUser.userType === "searcher" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prompts</Text>
              <Text style={styles.sectionSubtitle}>
                {(currentUser.prompts || []).length}/3 selected
              </Text>
            </View>
            <View style={styles.fieldsGrid}>
              <TouchableOpacity
                style={styles.promptsCard}
                onPress={() => setShowPromptsModal(true)}
                activeOpacity={0.7}
              >
                {currentUser.prompts && currentUser.prompts.length > 0 ? (
                  <View style={styles.promptsList}>
                    {currentUser.prompts.map((prompt, index) => (
                      <View key={prompt.id} style={styles.promptPreview}>
                        <Text style={styles.promptPreviewQuestion}>
                          {prompt.promptText}
                        </Text>
                        <Text style={styles.promptPreviewAnswer}>
                          {prompt.answer}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.promptsEmpty}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={32}
                      color="#A68B7B"
                    />
                    <Text style={styles.promptsEmptyText}>
                      Tap to add prompts (optional)
                    </Text>
                    <Text style={styles.promptsEmptySubtext}>
                      Up to 3 prompts to help others get to know you
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {currentUser.prompts &&
                currentUser.prompts.length > 0 &&
                currentUser.prompts.length < 3 && (
                  <TouchableOpacity
                    style={styles.addPromptButton}
                    onPress={() => setShowPromptsModal(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={24} color="#FF6B35" />
                    <Text style={styles.addPromptButtonText}>
                      Add Another Prompt
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        )}

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.fieldsGrid}>
            {renderFieldCard(
              "Age",
              "age",
              currentUser.age,
              "calendar-outline",
              true
            )}
            {renderFieldCard(
              "Race",
              "race",
              currentUser.race,
              "people-outline",
              true
            )}
            {renderFieldCard(
              "Gender",
              "gender",
              currentUser.gender,
              "person-outline",
              true
            )}
            {renderFieldCard(
              "Occupation",
              "jobRole",
              currentUser.jobRole || "",
              "briefcase-outline",
              false
            )}
            {renderFieldCard(
              "Workplace",
              "jobPlace",
              currentUser.jobPlace || "",
              "business-outline",
              false
            )}
            {currentUser.userType === "searcher" &&
              renderFieldCard(
                "University",
                "university",
                currentUser.university,
                "school-outline",
                true
              )}
            {currentUser.userType === "homeowner" &&
              renderFieldCard(
                "Host Experience",
                "yearsExperience",
                currentUser.yearsExperience
                  ? `${currentUser.yearsExperience} years`
                  : "",
                "trophy-outline",
                true
              )}
            {renderFieldCard(
              "Hometown",
              "hometown",
              currentUser.hometown,
              "home-outline",
              true
            )}
            {renderFieldCard(
              "Location",
              "location",
              currentUser.location,
              "location-outline",
              true
            )}
          </View>
        </View>

        {/* Lifestyle Section - Only for searchers */}
        {currentUser.userType === "searcher" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifestyle Preferences</Text>
            <View style={styles.fieldsGrid}>
              {renderFieldCard(
                "Smoking",
                "smoking",
                currentUser.smoking,
                "ban-outline",
                true
              )}
              {renderFieldCard(
                "Drinking",
                "drinking",
                currentUser.drinking,
                "wine-outline",
                true
              )}
              {renderFieldCard(
                "Drugs",
                "drugs",
                currentUser.drugs,
                "medical-outline",
                true
              )}
              {renderFieldCard(
                "Sleep Schedule",
                "nightOwl",
                currentUser.nightOwl,
                "moon-outline",
                true
              )}
              {renderFieldCard(
                "Religion",
                "religion",
                currentUser.religion,
                "rose-outline",
                true
              )}
              {renderFieldCard(
                "Pets",
                "pets",
                currentUser.pets,
                "paw-outline",
                true
              )}
              {renderFieldCard(
                "Friendliness",
                "friendliness",
                currentUser.friendliness
                  ? `${currentUser.friendliness}/10`
                  : "",
                "people-outline",
                true
              )}
              {renderFieldCard(
                "Cleanliness",
                "cleanliness",
                currentUser.cleanliness ? `${currentUser.cleanliness}/10` : "",
                "sparkles-outline",
                true
              )}
              {renderFieldCard(
                "Guests Allowed",
                "guestsAllowed",
                currentUser.guestsAllowed || "",
                "home-outline",
                true
              )}
            </View>
          </View>
        )}

        {/* Housing Preferences (for searchers) */}
        {currentUser.userType === "searcher" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Housing Preferences</Text>
            <View style={styles.fieldsGrid}>
              {renderFieldCard(
                "Max Housemates",
                "maxRoommates",
                getFieldValue("maxRoommates"),
                "people-outline",
                true
              )}
              {renderFieldCard(
                "Roommate Type",
                "roommateType",
                currentUser.roommateType,
                "home-outline",
                true
              )}
              {renderFieldCard(
                "Preferred City",
                "preferredCity",
                currentUser.preferredCity,
                "map-outline",
                true
              )}
              {renderFieldCard(
                "Space Type",
                "spaceType",
                Array.isArray(currentUser.spaceType)
                  ? currentUser.spaceType.join(", ")
                  : currentUser.spaceType || "",
                "business-outline",
                true
              )}
              {renderFieldCard(
                "Budget",
                "budget",
                getFieldValue("budget")
                  ? `$${currentUser?.minBudget || 0} - $${
                      currentUser?.maxBudget || 0
                    }`
                  : "",
                "cash-outline",
                true
              )}
              {renderFieldCard(
                "Lease Duration",
                "leaseDuration",
                getFieldValue("leaseDuration"),
                "time-outline",
                true
              )}
            </View>
          </View>
        )}

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#6F4E37" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* Delete Profile Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteProfile}
          disabled={isDeleting}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>
            {isDeleting ? "Deleting..." : "Delete Profile"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      {editingField && (
        <ProfileEditModal
          visible={!!editingField}
          field={editingField}
          value={getFieldValue(editingField)}
          user={currentUser}
          onClose={() => setEditingField(null)}
          onSave={handleSaveField}
        />
      )}

      {/* Prompts Modal */}
      <PromptsModal
        visible={showPromptsModal}
        prompts={currentUser.prompts || []}
        onClose={() => setShowPromptsModal(false)}
        onSave={async (prompts: UserPrompt[]) => {
          await updateUser(currentUser.id, { prompts });
          // Update Supabase
          try {
            await supabase
              .from("users")
              .update({ prompts: JSON.stringify(prompts) })
              .eq("id", currentUser.id);
          } catch (error) {
            console.error("Error updating prompts:", error);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5E1",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  completenessTracker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#E8D5C4",
  },
  completenessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  completenessLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6F4E37",
  },
  completenessPercentage: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B35",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E8D5C4",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FF6B35",
    borderRadius: 4,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
    alignItems: "center",
  },
  profilePicButton: {
    alignSelf: "center",
    marginBottom: 16,
    position: "relative",
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FF6B35",
  },
  profilePicPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8D5C4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#A68B7B",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF5E1",
  },
  headerInfo: {
    alignItems: "center",
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#6F4E37",
    marginBottom: 4,
  },
  status: {
    fontSize: 16,
    color: "#A68B7B",
    marginBottom: 8,
    fontWeight: "500",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: "#A68B7B",
  },
  completionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5D9",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  completionText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "500",
    flex: 1,
  },
  bioCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8D5C4",
  },
  bioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6F4E37",
  },
  bioText: {
    fontSize: 15,
    color: "#6F4E37",
    lineHeight: 22,
  },
  bioTextEmpty: {
    color: "#A68B7B",
    fontStyle: "italic",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6F4E37",
    marginBottom: 16,
    marginHorizontal: 20,
  },
  fieldsGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  fieldCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8D5C4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fieldCardRequired: {
    borderColor: "#FF6B35",
    borderWidth: 2,
    backgroundColor: "#FFF9F5",
  },
  fieldCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  fieldIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFE5D9",
    justifyContent: "center",
    alignItems: "center",
  },
  fieldTextContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#A68B7B",
    marginBottom: 4,
    fontWeight: "500",
  },
  fieldValue: {
    fontSize: 16,
    color: "#6F4E37",
    fontWeight: "600",
  },
  fieldValueEmpty: {
    color: "#A68B7B",
    fontStyle: "italic",
    fontWeight: "400",
  },
  noUserText: {
    fontSize: 18,
    color: "#6F4E37",
    textAlign: "center",
    marginTop: 100,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E8D5C4",
    gap: 8,
  },
  logoutButtonText: {
    color: "#6F4E37",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC3545",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    gap: 8,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#A68B7B",
    fontWeight: "500",
    marginRight: 14, // Move left by 14 pixels to prevent going off screen
  },
  promptsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E8D5C4",
    minHeight: 120,
  },
  promptsList: {
    gap: 16,
  },
  promptPreview: {
    marginBottom: 12,
  },
  promptPreviewQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6F4E37",
    marginBottom: 4,
  },
  promptPreviewAnswer: {
    fontSize: 14,
    color: "#6F4E37",
    lineHeight: 20,
  },
  promptsEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  promptsEmptyText: {
    fontSize: 16,
    color: "#6F4E37",
    fontWeight: "500",
    marginTop: 12,
    marginBottom: 4,
  },
  promptsEmptySubtext: {
    fontSize: 12,
    color: "#A68B7B",
    textAlign: "center",
  },
  addPromptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderStyle: "dashed",
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  addPromptButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
});
