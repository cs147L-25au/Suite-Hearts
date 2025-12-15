import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Image, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'SignUp'>;
  route?: { params?: { email?: string } };
}

type UserType = 'homeowner' | 'searcher' | '';
type LookingFor = 'roommates' | 'housing' | 'both' | '';

export default function SignUpScreen({ navigation, route }: Props) {
  const { addUser, setCurrentUser, updateUser } = useUser();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState<UserType>('');
  const [lookingFor, setLookingFor] = useState<LookingFor>('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [code, setCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [formData, setFormData] = useState({
    email: route?.params?.email || '',
    phone: '',
    name: '',
    profilePicture: null as string | null,
  });

  // Generate a UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData({ ...formData, profilePicture: result.assets[0].uri });
    }
  };

  const handleRequestCode = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      // Request OTP code from Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email.toLowerCase(),
        options: {
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        console.error('Error requesting OTP:', error);
        Alert.alert('Error', error.message || 'Failed to send code. Please try again.');
        setIsVerifyingCode(false);
        return;
      }

      // Code sent successfully
      setCodeSent(true);
    } catch (error) {
      console.error('Error requesting code:', error);
      Alert.alert('Error', 'Failed to send code. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit code.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      // Verify OTP code with Supabase (6-digit code)
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email.toLowerCase(),
        token: code,
        type: 'email',
      });

      if (error || !data) {
        Alert.alert('Invalid Code', error?.message || 'The code you entered is incorrect. Please try again.');
        setIsVerifyingCode(false);
        return;
      }

      // Email verified successfully
      setEmailVerified(true);
      setStep(2); // Move to phone step
      Alert.alert('Email Verified', 'Your email has been verified!');
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      // User type selection
      if (!userType) {
        Alert.alert('Required', 'Please select whether you are a homeowner or searcher.');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      // Email verification
      if (!formData.email || !formData.email.includes('@')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
      if (!emailVerified) {
        // Request code if not verified yet
        handleRequestCode();
        return;
      }
      // If already verified, move to next step
      setStep(2);
    } else if (step === 2) {
      // Phone - validate 10 digits (without formatting)
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (!phoneDigits || phoneDigits.length !== 10) {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Name
      if (!formData.name || formData.name.trim().length < 2) {
        Alert.alert('Invalid Name', 'Please enter your name.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      // Profile picture (optional but recommended)
      handleSignUpComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSignUpComplete = async () => {
    // Verify email is verified before completing signup
    if (!emailVerified) {
      Alert.alert('Email Not Verified', 'Please verify your email before completing signup.');
      return;
    }

    // Create user with minimal required fields
    // All other fields will be empty/null and filled in profile screen
    // Format phone number with country code
    const phoneDigits = formData.phone.replace(/\D/g, '');
    const formattedPhone = phoneDigits.length === 10 ? `+1${phoneDigits}` : formData.phone;

    // Get the authenticated user's ID from Supabase Auth
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id || generateUUID();

    const newUser: User = {
      id: userId,
      userType: userType as 'homeowner' | 'searcher',
      lookingFor: userType === 'searcher' ? lookingFor as 'roommates' | 'housing' | 'both' : undefined,
      email: formData.email,
      phone: formattedPhone,
      name: formData.name,
      profilePicture: formData.profilePicture,
      // All other fields start empty - will be filled in profile
    age: '',
    race: '',
    gender: '',
    job: '',
      hometown: '',
      location: '',
      smoking: '',
      drinking: '',
      drugs: '',
      nightOwl: '',
      religion: '',
      bio: '',
      questions: [],
      createdAt: Date.now(),
    };

    // Check if user with this email already exists
    try {
      // First, try to find existing user by email
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', newUser.email.toLowerCase())
        .limit(1);

      let userId = newUser.id;
      let shouldUpdate = false;

      // If we found a user, use their ID and update
      if (existingUsers && existingUsers.length > 0) {
        userId = existingUsers[0].id;
        shouldUpdate = true;
        newUser.id = userId; // Use existing ID
      }

      // Save to local storage
      if (shouldUpdate) {
        // Update existing user in local storage if found
        await updateUser(userId, newUser);
      } else {
        await addUser(newUser);
      }
      await setCurrentUser(newUser);
      
      // Save to Supabase (upsert - update if exists, insert if not)
      // When updating, completely overwrite with new signup data
      const userData = {
        id: userId,
        user_type: newUser.userType,
        looking_for: newUser.lookingFor,
        email: newUser.email.toLowerCase(),
        phone: newUser.phone,
        name: newUser.name,
        profile_picture_url: newUser.profilePicture,
        // Completely reset all other fields to null/empty (overwrite existing profile)
        age: null,
        race: null,
        gender: null,
        university: null,
        years_experience: null,
        job: null,
        job_role: null,
        job_place: null,
        hometown: null,
        location: null,
        pets: null,
        smoking: null,
        drinking: null,
        drugs: null,
        night_owl: null,
        religion: null,
        bio: null,
        questions: [],
        prompts: null,
        max_roommates: null,
        roommate_type: null,
        preferred_city: null,
        preferred_latitude: null,
        preferred_longitude: null,
        space_type: null,
        min_budget: null,
        max_budget: null,
        lease_duration: null,
      };

      let error;
      if (shouldUpdate) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update(userData)
          .eq('id', userId);
        error = updateError;
      } else {
        // Try to insert, but if it fails due to duplicate email, update instead
        const { error: insertError } = await supabase
          .from('users')
          .insert(userData);
        
        if (insertError && insertError.code === '23505') {
          // Duplicate email - fetch the existing user and update
          const { data: existingUserData } = await supabase
            .from('users')
            .select('id')
            .eq('email', newUser.email.toLowerCase())
            .single();
          
          if (existingUserData) {
            userId = existingUserData.id;
            newUser.id = userId;
            await setCurrentUser(newUser);
            await updateUser(userId, newUser);
            
            const { error: updateError } = await supabase
              .from('users')
              .update(userData)
              .eq('id', userId);
            error = updateError;
          } else {
            error = insertError;
          }
        } else {
          error = insertError;
        }
      }

      if (error) {
        console.error('Error saving to Supabase:', error);
        Alert.alert('Error', 'Failed to save account. Please try again.');
        return;
      }

      // Navigate to home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
  });
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      Alert.alert('Error', 'Failed to save account. Please try again.');
    }
  };

  const renderStep = () => {
    if (step === 0) {
      // User Type Selection
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>What are you looking for?</Text>
          <Text style={styles.subtitle}>Select your role to get started</Text>
          
          <TouchableOpacity
            style={[styles.optionButton, userType === 'homeowner' && styles.optionButtonSelected]}
            onPress={() => {
              setUserType('homeowner');
              setLookingFor('');
            }}
          >
            <Ionicons name="home" size={32} color={userType === 'homeowner' ? '#FFF5E1' : '#6F4E37'} />
            <Text style={[styles.optionText, userType === 'homeowner' && styles.optionTextSelected]}>
              I'm a Homeowner
            </Text>
            <Text style={[styles.optionSubtext, userType === 'homeowner' && styles.optionSubtextSelected]}>
              I want to list my property
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, userType === 'searcher' && styles.optionButtonSelected]}
            onPress={() => setUserType('searcher')}
          >
            <Ionicons name="search" size={32} color={userType === 'searcher' ? '#FFF5E1' : '#6F4E37'} />
            <Text style={[styles.optionText, userType === 'searcher' && styles.optionTextSelected]}>
              I'm Looking
            </Text>
            <Text style={[styles.optionSubtext, userType === 'searcher' && styles.optionSubtextSelected]}>
              I want to find housing or roommates
            </Text>
          </TouchableOpacity>

          {userType === 'searcher' && (
            <View style={styles.lookingForContainer}>
              <Text style={styles.lookingForTitle}>What are you looking for?</Text>
              <TouchableOpacity
                style={[styles.lookingForButton, lookingFor === 'roommates' && styles.lookingForButtonSelected]}
                onPress={() => setLookingFor('roommates')}
              >
                <Text style={[styles.lookingForText, lookingFor === 'roommates' && styles.lookingForTextSelected]}>
                  Roommates
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lookingForButton, lookingFor === 'housing' && styles.lookingForButtonSelected]}
                onPress={() => setLookingFor('housing')}
              >
                <Text style={[styles.lookingForText, lookingFor === 'housing' && styles.lookingForTextSelected]}>
                  Housing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lookingForButton, lookingFor === 'both' && styles.lookingForButtonSelected]}
                onPress={() => setLookingFor('both')}
              >
                <Text style={[styles.lookingForText, lookingFor === 'both' && styles.lookingForTextSelected]}>
                  Both
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    } else if (step === 1) {
      // Email verification
      return (
        <View style={styles.stepContainer}>
          {!codeSent ? (
            <>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>We'll send you a 6-digit code</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#A68B7B"
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  setEmailVerified(false);
                  setCodeSent(false);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!emailVerified}
              />

              <TouchableOpacity
                style={[styles.verifyButton, isVerifyingCode && styles.verifyButtonDisabled]}
                onPress={handleRequestCode}
                disabled={isVerifyingCode}
              >
                <Text style={styles.verifyButtonText}>
                  {isVerifyingCode ? 'Sending code...' : 'Send Code'}
                </Text>
              </TouchableOpacity>
            </>
          ) : !emailVerified ? (
            <>
              <View style={styles.codeSentContainer}>
                <View style={styles.codeSentIconContainer}>
                  <Ionicons name="mail" size={64} color="#FF6B35" />
                </View>
                <Text style={styles.codeSentTitle}>Check your email</Text>
                <Text style={styles.codeSentText}>
                  A one-time passcode has been sent to your email
                </Text>
                <Text style={styles.codeSentEmail}>{formData.email}</Text>
                <Text style={styles.codeSentSubtext}>
                  Enter the 6-digit code below to continue
                </Text>
              </View>

              <View style={styles.codeInputContainer}>
                <Text style={styles.codeLabel}>Enter 6-digit code</Text>
                <TextInput
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor="#A68B7B"
                  value={code}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '').slice(0, 6);
                    setCode(digits);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.verifyButton, (isVerifyingCode || code.length !== 6) && styles.verifyButtonDisabled]}
                onPress={handleVerifyCode}
                disabled={isVerifyingCode || code.length !== 6}
              >
                <Text style={styles.verifyButtonText}>
                  {isVerifyingCode ? 'Verifying...' : 'Verify Code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => {
                  setCode('');
                  handleRequestCode();
                }}
                disabled={isVerifyingCode}
              >
                <Text style={styles.resendButtonText}>Resend code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.verifiedContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={styles.verifiedText}>Email verified!</Text>
            </View>
          )}
        </View>
      );
    } else if (step === 2) {
      // Phone
      const formatPhoneNumber = (text: string) => {
        // Remove all non-digits
        const digits = text.replace(/\D/g, '');
        // Limit to 10 digits
        const limited = digits.slice(0, 10);
        // Format as XXX-XXX-XXXX
        if (limited.length <= 3) {
          return limited;
        } else if (limited.length <= 6) {
          return `${limited.slice(0, 3)}-${limited.slice(3)}`;
        } else {
          return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
        }
      };

      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>What's your phone number?</Text>
          <Text style={styles.subtitle}>+1 (US only)</Text>
            <TextInput
              style={styles.input}
            placeholder="XXX-XXX-XXXX"
            placeholderTextColor="#A68B7B"
            value={formData.phone}
            onChangeText={(text) => {
              const formatted = formatPhoneNumber(text);
              setFormData({ ...formData, phone: formatted });
            }}
            keyboardType="phone-pad"
            maxLength={12} // XXX-XXX-XXXX format
          />
        </View>
      );
    } else if (step === 3) {
      // Name
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>What's your name?</Text>
            <TextInput
              style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#A68B7B"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            autoCapitalize="words"
          />
        </View>
      );
    } else if (step === 4) {
      // Profile Picture
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Add a profile picture</Text>
          <Text style={styles.subtitle}>This helps others get to know you</Text>
          
          <TouchableOpacity style={styles.imagePickerButton} onPress={handleImagePicker}>
            {formData.profilePicture ? (
              <Image source={{ uri: formData.profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={48} color="#A68B7B" />
                <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.optionalText}>Optional - You can add this later</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#6F4E37" />
        </TouchableOpacity>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${((step + 1) / 5) * 100}%` }]} />
        </View>

        {/* Step Content */}
        {renderStep()}

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {step === 4 ? 'Complete' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF5E1" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E8D5C4',
    borderRadius: 2,
    marginBottom: 40,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6F4E37',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A68B7B',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#6F4E37',
    borderWidth: 1,
    borderColor: '#E8D5C4',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  optionButtonSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  optionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginTop: 12,
  },
  optionTextSelected: {
    color: '#FFF5E1',
  },
  optionSubtext: {
    fontSize: 14,
    color: '#A68B7B',
    marginTop: 4,
  },
  optionSubtextSelected: {
    color: '#FFF5E1',
  },
  lookingForContainer: {
    marginTop: 20,
    gap: 12,
  },
  lookingForTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
  },
  lookingForButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  lookingForButtonSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  lookingForText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6F4E37',
    textAlign: 'center',
  },
  lookingForTextSelected: {
    color: '#FFF5E1',
  },
  imagePickerButton: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#FF6B35',
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E8D5C4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#A68B7B',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#A68B7B',
  },
  optionalText: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  nextButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  nextButtonText: {
    color: '#FFF5E1',
    fontSize: 18,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFF5E1',
    fontSize: 16,
    fontWeight: '600',
  },
  codeInputContainer: {
    marginTop: 24,
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 14,
    color: '#6F4E37',
    marginBottom: 8,
    fontWeight: '500',
  },
  codeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    padding: 20,
    fontSize: 28,
    fontWeight: '700',
    color: '#6F4E37',
    textAlign: 'center',
    letterSpacing: 6,
    minHeight: 70,
  },
  codeSentContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  codeSentIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFE5D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  codeSentTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6F4E37',
    marginBottom: 12,
    textAlign: 'center',
  },
  codeSentText: {
    fontSize: 16,
    color: '#6F4E37',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  codeSentEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeSentSubtext: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  verifiedContainer: {
    alignItems: 'center',
    marginTop: 24,
    padding: 24,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 12,
  },
});
