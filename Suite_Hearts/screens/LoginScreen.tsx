import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@types';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { User, UserPrompt } from '../types';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
}

export default function LoginScreen({ navigation }: Props) {
  const { users, setCurrentUser, updateUser } = useUser();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'codeSent' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Request OTP code from Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          // This will send a 6-digit code by default, but we'll format it as 4 digits in email template
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        console.error('Error requesting OTP:', error);
        Alert.alert('Error', error.message || 'Failed to send code. Please try again.');
        setIsLoading(false);
        return;
      }

      // Code sent successfully - show confirmation screen
      setStep('codeSent');
    } catch (error) {
      console.error('Error requesting code:', error);
      Alert.alert('Error', 'Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP code with Supabase (6-digit code)
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: code,
        type: 'email',
      });

      if (error || !data.user) {
        console.error('Error verifying code:', error);
        Alert.alert('Invalid Code', error?.message || 'The code you entered is incorrect. Please try again.');
        setIsLoading(false);
        return;
      }

      // Authentication successful - now fetch user profile from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !userData) {
        // User authenticated but no profile - redirect to signup to complete profile
        Alert.alert(
          'Profile Not Found',
          'Your email is verified, but we need to complete your profile. Please sign up.',
          [
            {
              text: 'Sign Up',
              onPress: () => {
                // Pass email to signup screen
                navigation.navigate('SignUp', { email: email.toLowerCase() });
              },
            },
          ]
        );
        setIsLoading(false);
        return;
      }

      // Parse space_type if it's a JSON string
      let spaceType: string | string[] | undefined = undefined;
      if (userData.space_type) {
        try {
          const parsed = JSON.parse(userData.space_type);
          spaceType = Array.isArray(parsed) ? parsed : userData.space_type;
        } catch {
          spaceType = userData.space_type;
        }
      }

      // Parse prompts if it's a JSON string
      let prompts: UserPrompt[] | undefined = undefined;
      if (userData.prompts) {
        try {
          const parsed = JSON.parse(userData.prompts);
          prompts = Array.isArray(parsed) ? parsed : undefined;
        } catch {
          prompts = undefined;
        }
      }

      // Convert Supabase user to app User format with all fields
      const user: User = {
        id: userData.id,
        userType: userData.user_type as 'homeowner' | 'searcher',
        lookingFor: userData.looking_for as 'roommates' | 'housing' | 'both' | undefined,
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
        age: userData.age || '',
        race: userData.race || '',
        gender: userData.gender || '',
        university: userData.university || undefined,
        yearsExperience: userData.years_experience || undefined,
        job: userData.job || '',
        jobRole: userData.job_role || undefined,
        jobPlace: userData.job_place || undefined,
        profilePicture: userData.profile_picture_url || null,
        hometown: userData.hometown || '',
        location: userData.location || '',
        pets: userData.pets || undefined,
        smoking: userData.smoking || '',
        drinking: userData.drinking || '',
        drugs: userData.drugs || '',
        nightOwl: userData.night_owl || '',
        religion: userData.religion || '',
        bio: userData.bio || '',
        questions: userData.questions || [],
        prompts: prompts,
        maxRoommates: userData.max_roommates || undefined,
        roommateType: userData.roommate_type || undefined,
        preferredCity: userData.preferred_city || undefined,
        preferredLatitude: userData.preferred_latitude || undefined,
        preferredLongitude: userData.preferred_longitude || undefined,
        spaceType: spaceType,
        minBudget: userData.min_budget ? Number(userData.min_budget) : undefined,
        maxBudget: userData.max_budget ? Number(userData.max_budget) : undefined,
        leaseDuration: userData.lease_duration || undefined,
        createdAt: new Date(userData.created_at).getTime(),
      };

      // Update local storage with the fetched user
      await setCurrentUser(user);
      
      // Also update the users array in context to keep it in sync
      await updateUser(user.id, user);
      
      // Session is automatically persisted by Supabase
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode('');
    await handleRequestCode();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#6F4E37" />
        </TouchableOpacity>

        {/* Logo/Title Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="home" size={48} color="#FF6B35" />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          {step === 'email' ? (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#A68B7B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#A68B7B"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={handleRequestCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.loginButtonText}>Sending code...</Text>
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Send Code</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF5E1" />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : step === 'codeSent' ? (
            <>
              <View style={styles.codeSentContainer}>
                <View style={styles.codeSentIconContainer}>
                  <Ionicons name="mail" size={64} color="#FF6B35" />
                </View>
                <Text style={styles.codeSentTitle}>Check your email</Text>
                <Text style={styles.codeSentText}>
                  A one-time passcode has been sent to your email
                </Text>
                <Text style={styles.codeSentEmail}>{email}</Text>
                <Text style={styles.codeSentSubtext}>
                  Enter the 6-digit code below to continue
                </Text>
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setStep('code')}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToEmailButton}
                onPress={() => {
                  setStep('email');
                  setCode('');
                }}
              >
                <Text style={styles.backToEmailText}>Change email</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.codeContainer}>
                <Text style={styles.codeTitle}>Enter your 6-digit code</Text>
                <Text style={styles.codeSubtitle}>We sent a code to {email}</Text>
                
                <View style={styles.codeInputContainer}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="000000"
                    placeholderTextColor="#A68B7B"
                    value={code}
                    onChangeText={(text) => {
                      // Only allow digits, max 6
                      const digits = text.replace(/\D/g, '').slice(0, 6);
                      setCode(digits);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendCode}
                  disabled={isLoading}
                >
                  <Text style={styles.resendButtonText}>Resend code</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, (isLoading || code.length !== 6) && styles.loginButtonDisabled]}
                onPress={handleVerifyCode}
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <Text style={styles.loginButtonText}>Verifying...</Text>
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Verify Code</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF5E1" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToEmailButton}
                onPress={() => {
                  setStep('email');
                  setCode('');
                }}
                disabled={isLoading}
              >
                <Text style={styles.backToEmailText}>Change email</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.signUpLink}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.signUpLinkText}>
              Don't have an account? <Text style={styles.signUpLinkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE5D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6F4E37',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A68B7B',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    marginBottom: 20,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#6F4E37',
    paddingVertical: 16,
  },
  loginButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFF5E1',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8D5C4',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#A68B7B',
    fontWeight: '500',
  },
  signUpLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  signUpLinkText: {
    fontSize: 14,
    color: '#A68B7B',
  },
  signUpLinkBold: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  codeContainer: {
    marginBottom: 24,
  },
  codeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6F4E37',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeSubtitle: {
    fontSize: 14,
    color: '#A68B7B',
    marginBottom: 32,
    textAlign: 'center',
  },
  codeInputContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
    width: '100%',
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
  continueButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    color: '#FFF5E1',
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  backToEmailButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  backToEmailText: {
    fontSize: 14,
    color: '#A68B7B',
    fontWeight: '500',
  },
});

