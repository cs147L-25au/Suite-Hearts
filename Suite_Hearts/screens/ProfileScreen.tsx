import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

export default function ProfileScreen() {
  const { currentUser } = useUser();

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>No user data found</Text>
      </View>
    );
  }

  const getStatusText = () => {
    if (currentUser.userType === 'homeowner') {
      return `Host in ${currentUser.location}`;
    } else {
      const lookingForText = 
        currentUser.lookingFor === 'roommates' ? 'Roommates' :
        currentUser.lookingFor === 'housing' ? 'Housing' :
        currentUser.lookingFor === 'both' ? 'Roommates + Housing' : '';
      return `Looking for ${lookingForText} / ${currentUser.location}`;
    }
  };

  const personalInfo = [
    currentUser.age,
    currentUser.race,
    currentUser.job,
    currentUser.university && `University: ${currentUser.university}`,
    currentUser.religion && `Religion: ${currentUser.religion}`,
    currentUser.hometown,
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.greetingBox}>
          <Text style={styles.greetingText}>Hi, {currentUser.name}</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#6F4E37" />
        </TouchableOpacity>
      </View>

      {/* Profile Picture Section */}
      <View style={styles.profileSection}>
        <View style={styles.profilePicContainer}>
          {currentUser.profilePicture ? (
            <Image source={{ uri: currentUser.profilePicture }} style={styles.profilePic} />
          ) : (
            <View style={styles.profilePicPlaceholder}>
              <Ionicons name="person" size={60} color="#E8D5C4" />
            </View>
          )}
          <TouchableOpacity style={styles.addPhotoButton}>
            <Ionicons name="add" size={20} color="#FFF5E1" />
          </TouchableOpacity>
        </View>

        {/* Status and Bio */}
        <View style={styles.infoSection}>
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            {currentUser.userType === 'searcher' && (
              <Text style={styles.locationLink}>{currentUser.location}</Text>
            )}
          </View>
          <View style={styles.bioBox}>
            <Text style={styles.bioText}>{currentUser.bio || 'No bio yet'}</Text>
          </View>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.personalInfoBox}>
        <Text style={styles.personalInfoText}>
          {personalInfo.join(' | ')}
        </Text>
      </View>

      {/* Dynamic Content Sections */}
      {currentUser.userType === 'searcher' ? (
        <View style={styles.contentBox}>
          <Text style={styles.contentText}>
            Prompts about what they're looking for
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.contentBox}>
            <Text style={styles.contentText}>
              Listing cards for available properties
            </Text>
          </View>
          <View style={styles.contentBox}>
            <Text style={styles.contentText}>
              More listing cards
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1', // Beige
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingBox: {
    backgroundColor: '#E8F4FD', // Light blue
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#000000',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
  },
  settingsButton: {
    backgroundColor: '#E8F4FD', // Light blue
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  profileSection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  profilePicContainer: {
    position: 'relative',
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#000000',
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E8F4FD', // Light blue
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#FF6B35', // Orange
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  infoSection: {
    flex: 1,
    gap: 12,
  },
  statusBox: {
    backgroundColor: '#E8F4FD', // Light blue
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#000000',
  },
  statusText: {
    fontSize: 14,
    color: '#6F4E37',
    fontWeight: '500',
  },
  locationLink: {
    fontSize: 14,
    color: '#6F4E37',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  bioBox: {
    backgroundColor: '#E8F4FD', // Light blue
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#000000',
  },
  bioText: {
    fontSize: 14,
    color: '#6F4E37',
    lineHeight: 20,
  },
  personalInfoBox: {
    backgroundColor: '#E8F4FD', // Light blue
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#000000',
  },
  personalInfoText: {
    fontSize: 14,
    color: '#6F4E37',
    lineHeight: 22,
  },
  contentBox: {
    backgroundColor: '#E8F4FD', // Light blue
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
  },
  contentText: {
    fontSize: 14,
    color: '#6F4E37',
    textAlign: 'center',
  },
  noUserText: {
    fontSize: 18,
    color: '#6F4E37',
    textAlign: 'center',
    marginTop: 100,
  },
});

