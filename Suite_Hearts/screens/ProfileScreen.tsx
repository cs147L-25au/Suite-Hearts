import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { RootStackParamList } from '../types';
import { supabase } from '../lib/supabase';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { currentUser, deleteUser } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your profile? This action cannot be undone and will remove all your data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            
            setIsDeleting(true);
            try {
              // Delete from Supabase
              await supabase.from('users').delete().eq('id', currentUser.id);
              await supabase.from('messages').delete().or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
              await supabase.from('conversations').delete().contains('participants', [currentUser.id]);
              await supabase.from('swipes').delete().or(`swiper_id.eq.${currentUser.id},swiped_id.eq.${currentUser.id}`);
              await supabase.from('matches').delete().or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);
              
              // Delete from local storage
              await deleteUser(currentUser.id);
              
              // Navigate back to sign up
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignUp' }],
              });
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'Failed to delete profile. Please try again.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

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

      {/* Delete Profile Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeleteProfile}
        disabled={isDeleting}
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        <Text style={styles.deleteButtonText}>
          {isDeleting ? 'Deleting...' : 'Delete Profile'}
        </Text>
      </TouchableOpacity>
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545', // Red
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 40,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

