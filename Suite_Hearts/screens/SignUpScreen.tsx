import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Image, Modal, FlatList } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';
import { User } from '../types';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'SignUp'>;
}

type UserType = 'homeowner' | 'searcher' | '';
type LookingFor = 'roommates' | 'housing' | 'both' | '';

export default function SignUpScreen({ navigation }: Props) {
  const { addUser, setCurrentUser } = useUser();
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState<UserType>('');
  const [lookingFor, setLookingFor] = useState<LookingFor>('');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
    age: '',
    race: '',
    gender: '',
    university: '',
    yearsExperience: '',
    job: '',
    profilePicture: null as string | null,
    hometown: '',
    location: '',
    pets: '',
    smoking: '',
    drinking: '',
    drugs: '',
    nightOwl: '',
    religion: '',
    bio: '',
    questions: ['', '', '', '', ''],
    // New housing preferences
    maxRoommates: '',
    roommateType: '',
    preferredCity: '',
    preferredLatitude: null as number | null,
    preferredLongitude: null as number | null,
    spaceType: '',
    minBudget: '',
    maxBudget: '',
    leaseDuration: '',
  });
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [dropdownKey, setDropdownKey] = useState<string>('');

  // Dropdown options
  const ageOptions = Array.from({ length: 86 }, (_, i) => (i + 14).toString());
  const raceOptions = [
    'East Asian',
    'Black',
    'Pacific Islander',
    'Native American',
    'White',
    'Hispanic',
    'Middle Eastern',
    'South Asian',
    'South East Asian',
    'Mixed',
    'Jewish',
    'Prefer Not To Say',
  ];
  const universityOptions = ['Stanford', 'N/A'];
  const cityOptions = ['Palo Alto', 'SF', 'SJ', 'Berkeley'];
  const roommateTypeOptions = ['Roommates', 'Suitemates', 'Both'];
  const spaceTypeOptions = ['Condo', 'Townhome', 'House', 'Dorm'];
  const leaseDurationOptions = Array.from({ length: 12 }, (_, i) => `${i + 1} month${i > 0 ? 's' : ''}`);

  // Calculate total steps based on user type
  const getTotalSteps = () => {
    if (userType === 'homeowner') {
      return 19; // email, phone, name, age, race, gender, yearsExperience, job, profile, hometown, location, smoking, drinking, drugs, nightOwl, religion, bio
    } else {
      // Base questions + housing questions if looking for housing
      const baseCount = 20; // email, phone, name, age, race, gender, university, job, profile, hometown, location, pets, smoking, drinking, drugs, nightOwl, religion, bio
      const housingCount = (lookingFor === 'housing' || lookingFor === 'both') ? 8 : 0; // 8 new housing questions
      return baseCount + housingCount;
    }
  };

  // Get current question index (0-based for questionnaire)
  const getQuestionIndex = () => {
    if (userType === 'homeowner') {
      return step - 1; // Step 0 is selection, step 1+ are questions
    } else {
      return step - 2; // Steps 0-1 are selection screens, step 2+ are questions
    }
  };

  // Get all questions for current user type
  const getQuestions = () => {
    const baseQuestions = [
      { key: 'email', label: 'What is your email?', type: 'email' },
      { key: 'phone', label: 'What is your phone number?', type: 'phone' },
      { key: 'name', label: 'What is your name?', type: 'text' },
      { key: 'age', label: 'What is your age?', type: 'age' },
      { key: 'race', label: 'What is your race?', type: 'race' },
      { key: 'gender', label: 'What is your gender?', type: 'text' },
    ];

    const lifestyleQuestions = [
      { key: 'smoking', label: 'Do you smoke?', type: 'yesnodontcare' },
      { key: 'drinking', label: 'Do you drink?', type: 'yesnodontcare' },
      { key: 'drugs', label: 'Do you use drugs?', type: 'yesnodontcare' },
      { key: 'nightOwl', label: 'Are you a night owl or early bird?', type: 'nightowl' },
      { key: 'religion', label: 'What is your religion?', type: 'text' },
      { key: 'bio', label: 'Write a bio (10-50 words)', type: 'bio' },
    ];

    if (userType === 'homeowner') {
      return [
        ...baseQuestions,
        { key: 'yearsExperience', label: 'How many years of experience do you have renting/hosting?', type: 'number' },
        { key: 'job', label: 'What is your job?', type: 'text' },
        { key: 'profilePicture', label: 'Upload your profile picture', type: 'image' },
        { key: 'hometown', label: 'Where are you from?', type: 'text' },
        { key: 'location', label: 'Where are you based now?', type: 'text' },
        ...lifestyleQuestions,
      ];
    } else {
      // Searcher questions
      const housingQuestions = lookingFor === 'housing' || lookingFor === 'both' ? [
        { key: 'maxRoommates', label: 'Up to how many people are you okay with living with?', type: 'number' },
        { key: 'roommateType', label: 'Roommates or suitemates or both?', type: 'roommateType' },
        { key: 'preferredCity', label: 'What city do you want to live in?', type: 'city' },
        { key: 'preferredLocation', label: 'Pin exact coordinates on map (Optional)', type: 'mapPin' },
        { key: 'spaceType', label: 'What kind of space?', type: 'spaceType' },
        { key: 'minBudget', label: 'Minimum monthly budget?', type: 'number' },
        { key: 'maxBudget', label: 'Maximum monthly budget?', type: 'number' },
        { key: 'leaseDuration', label: 'How long of a period?', type: 'leaseDuration' },
      ] : [];

      return [
        ...baseQuestions,
        { key: 'university', label: 'What is your university affiliation? (Optional)', type: 'university' },
        { key: 'job', label: 'What is your job?', type: 'text' },
        { key: 'profilePicture', label: 'Upload your profile picture', type: 'image' },
        { key: 'hometown', label: 'Where are you from?', type: 'text' },
        { key: 'location', label: 'Where are you looking to live?', type: 'text' },
        { key: 'pets', label: 'Do you have pets?', type: 'yesnodontcare' },
        ...housingQuestions, // Add housing questions if looking for housing
        ...lifestyleQuestions,
      ];
    }
  };

  const questions = getQuestions();
  const questionIndex = getQuestionIndex();
  const totalSteps = getTotalSteps();
  const currentQuestion = questions[questionIndex];
  const progress = userType ? ((questionIndex + 1) / totalSteps) * 100 : 0;

  const updateFormData = (key: string, value: string) => {
    if (key.startsWith('question')) {
      const qIndex = parseInt(key.replace('question', '')) - 1;
      const updatedQuestions = [...formData.questions];
      updatedQuestions[qIndex] = value;
      setFormData({ ...formData, questions: updatedQuestions });
    } else {
      setFormData({ ...formData, [key]: value });
    }
  };

  const getFormValue = (key: string) => {
    if (key.startsWith('question')) {
      const qIndex = parseInt(key.replace('question', '')) - 1;
      return formData.questions[qIndex];
    }
    if (key === 'preferredLocation') {
      return formData.preferredLatitude && formData.preferredLongitude 
        ? `${formData.preferredLatitude.toFixed(4)}, ${formData.preferredLongitude.toFixed(4)}`
        : '';
    }
    const value = formData[key as keyof typeof formData];
    return value !== null && value !== undefined ? String(value) : '';
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleNext = () => {
    // Validate bio if it's the bio question
    if (currentQuestion?.key === 'bio') {
      const wordCount = getWordCount(formData.bio);
      if (wordCount < 10 || wordCount > 50) {
        // Don't proceed if bio doesn't meet requirements
        return;
      }
    }

    if (questionIndex < questions.length - 1) {
      setStep(step + 1);
    } else {
      // Sign up complete - save user data
      handleSignUpComplete();
    }
  };

  const handleSignUpComplete = async () => {
    const newUser: User = {
      id: `${Date.now()}-${Math.random()}`,
      userType: userType as 'homeowner' | 'searcher',
      lookingFor: userType === 'searcher' ? lookingFor as 'roommates' | 'housing' | 'both' : undefined,
      email: formData.email,
      phone: formData.phone,
      name: formData.name,
      age: formData.age,
      race: formData.race,
      gender: formData.gender,
      university: userType === 'searcher' ? formData.university : undefined,
      yearsExperience: userType === 'homeowner' ? formData.yearsExperience : undefined,
      job: formData.job,
      profilePicture: formData.profilePicture,
      hometown: formData.hometown,
      location: formData.location,
      pets: userType === 'searcher' ? formData.pets : undefined,
      smoking: formData.smoking,
      drinking: formData.drinking,
      drugs: formData.drugs,
      nightOwl: formData.nightOwl,
      religion: formData.religion,
      bio: formData.bio,
      questions: formData.questions,
      // New housing preferences
      maxRoommates: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both')) ? parseInt(formData.maxRoommates) : undefined,
      roommateType: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both')) ? (formData.roommateType.toLowerCase() as 'roommates' | 'suitemates' | 'both') : undefined,
      preferredCity: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both')) ? formData.preferredCity : undefined,
      preferredLatitude: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both') && formData.preferredLatitude !== null) ? formData.preferredLatitude : undefined,
      preferredLongitude: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both') && formData.preferredLongitude !== null) ? formData.preferredLongitude : undefined,
      spaceType: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both')) ? (formData.spaceType as 'Condo' | 'Townhome' | 'House' | 'Dorm') : undefined,
      minBudget: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both')) ? parseFloat(formData.minBudget) : undefined,
      maxBudget: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both')) ? parseFloat(formData.maxBudget) : undefined,
      leaseDuration: (userType === 'searcher' && (lookingFor === 'housing' || lookingFor === 'both')) ? parseInt(formData.leaseDuration) : undefined,
      createdAt: Date.now(),
    };

    await addUser(newUser);
    await setCurrentUser(newUser);
    navigation.navigate('Home');
  };

  const handleFinishLater = async () => {
    // Create a minimal user profile with current data and skip to Home
    const newUser: User = {
      id: `${Date.now()}-${Math.random()}`,
      userType: userType as 'homeowner' | 'searcher',
      lookingFor: userType === 'searcher' ? (lookingFor as 'roommates' | 'housing' | 'both' || 'roommates') : undefined,
      email: formData.email || '',
      phone: formData.phone || '',
      name: formData.name || 'User',
      age: formData.age || '25',
      race: formData.race || '',
      gender: formData.gender || '',
      university: userType === 'searcher' ? formData.university : undefined,
      yearsExperience: userType === 'homeowner' ? formData.yearsExperience : undefined,
      job: formData.job || '',
      profilePicture: formData.profilePicture,
      hometown: formData.hometown || '',
      location: formData.location || '',
      pets: userType === 'searcher' ? formData.pets : undefined,
      smoking: formData.smoking || '',
      drinking: formData.drinking || '',
      drugs: formData.drugs || '',
      nightOwl: formData.nightOwl || '',
      religion: formData.religion || '',
      bio: formData.bio || '',
      questions: formData.questions,
      // New housing preferences with defaults
      maxRoommates: undefined,
      roommateType: undefined,
      preferredCity: undefined,
      preferredLatitude: undefined,
      preferredLongitude: undefined,
      spaceType: undefined,
      minBudget: undefined,
      maxBudget: undefined,
      leaseDuration: undefined,
      createdAt: Date.now(),
    };

    await addUser(newUser);
    await setCurrentUser(newUser);
    navigation.navigate('Home');
  };

  const handleBack = () => {
    if (step === 0) {
      // Go back to Introduction screen
      navigation.goBack();
    } else if (step === 1 && userType === 'searcher') {
      // Go back to user type selection
      setStep(0);
      setUserType('');
      setLookingFor('');
    } else if (step === 1 && userType === 'homeowner') {
      // Go back to user type selection
      setStep(0);
      setUserType('');
    } else {
      // Go back to previous question
      setStep(step - 1);
    }
  };

  const handleImageUpload = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to upload photos!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFormData({ ...formData, profilePicture: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image. Please try again.');
    }
  };

  const openDropdown = (key: string, options: string[]) => {
    setDropdownKey(key);
    setDropdownOptions(options);
    setDropdownVisible(true);
  };

  const selectDropdownOption = (option: string) => {
    updateFormData(dropdownKey, option);
    setDropdownVisible(false);
  };

  const renderProgressBar = () => {
    if (!userType) return null;
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  };

  const renderSelectionScreen = () => {
    if (step === 0) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.title}>Are you listing a home or looking for a place to stay?</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.squareButton, userType === 'homeowner' && styles.squareButtonSelected]}
              onPress={() => {
                setUserType('homeowner');
                setStep(1); // Go directly to questions for homeowner
              }}
            >
              <Text style={[styles.squareButtonText, userType === 'homeowner' && styles.squareButtonTextSelected]}>
                Listing a Home
              </Text>
          </TouchableOpacity>
            <TouchableOpacity
              style={[styles.squareButton, userType === 'searcher' && styles.squareButtonSelected]}
              onPress={() => {
                setUserType('searcher');
                setStep(1);
              }}
            >
              <Text style={[styles.squareButtonText, userType === 'searcher' && styles.squareButtonTextSelected]}>
                Looking for a Place
              </Text>
          </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.navButton, styles.backButton, { marginTop: 30 }]}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={24} color="#6F4E37" />
            <Text style={[styles.navButtonText, styles.backButtonText]}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 1 && userType === 'searcher') {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.title}>What are you looking for?</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.squareButton, lookingFor === 'roommates' && styles.squareButtonSelected]}
              onPress={() => {
                setLookingFor('roommates');
                setStep(2);
              }}
            >
              <Text style={[styles.squareButtonText, lookingFor === 'roommates' && styles.squareButtonTextSelected]}>
                Just Roommates
              </Text>
          </TouchableOpacity>
            <TouchableOpacity
              style={[styles.squareButton, lookingFor === 'housing' && styles.squareButtonSelected]}
              onPress={() => {
                setLookingFor('housing');
                setStep(2);
              }}
            >
              <Text style={[styles.squareButtonText, lookingFor === 'housing' && styles.squareButtonTextSelected]}>
                Just Housing
              </Text>
          </TouchableOpacity>
            <TouchableOpacity
              style={[styles.squareButton, lookingFor === 'both' && styles.squareButtonSelected]}
              onPress={() => {
                setLookingFor('both');
                setStep(2);
              }}
            >
              <Text style={[styles.squareButtonText, lookingFor === 'both' && styles.squareButtonTextSelected]}>
                Roommates + Housing
              </Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.navButton, styles.backButton, { marginTop: 30 }]}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={24} color="#6F4E37" />
          <Text style={[styles.navButtonText, styles.backButtonText]}>Back</Text>
        </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const renderButtonSelection = (options: string[], selectedValue: string, onSelect: (value: string) => void) => {
    return (
      <View style={styles.buttonSelectionContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.selectionButton, selectedValue === option && styles.selectionButtonSelected]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.selectionButtonText, selectedValue === option && styles.selectionButtonTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDropdown = (options: string[], selectedValue: string, onSelect: (value: string) => void) => {
    return (
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => openDropdown(currentQuestion.key, options)}
      >
        <Text style={[styles.dropdownButtonText, !selectedValue && styles.dropdownButtonTextPlaceholder]}>
          {selectedValue || 'Select an option'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6F4E37" />
      </TouchableOpacity>
    );
  };

  const renderQuestionScreen = () => {
    // Don't show questions if we're still in selection phase
    if (step === 0 || (step === 1 && userType === 'searcher' && !lookingFor)) {
      return null;
    }
    if (!currentQuestion || (userType === 'searcher' && !lookingFor)) return null;

    const value = getFormValue(currentQuestion.key);
    const wordCount = currentQuestion.key === 'bio' ? getWordCount(formData.bio) : 0;
    const bioValid = currentQuestion.key === 'bio' ? (wordCount >= 10 && wordCount <= 50) : true;

    return (
      <View style={styles.centerContent}>
        <Text style={styles.questionTitle}>{currentQuestion.label}</Text>
        
        {currentQuestion.type === 'image' ? (
          <View style={styles.imageUploadContainer}>
            <TouchableOpacity style={styles.imageUploadButton} onPress={handleImageUpload}>
              {formData.profilePicture ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: formData.profilePicture }} style={styles.imagePreview} />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="checkmark-circle" size={32} color="#FF6B35" />
                    <Text style={styles.imageUploadText}>Photo uploaded</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.imageUploadPlaceholder}>
                  <Ionicons name="camera" size={48} color="#FF6B35" />
                  <Text style={styles.imageUploadText}>Tap to upload photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : currentQuestion.type === 'age' ? (
          renderDropdown(ageOptions, value, (selected) => updateFormData(currentQuestion.key, selected))
        ) : currentQuestion.type === 'race' ? (
          renderDropdown(raceOptions, value, (selected) => updateFormData(currentQuestion.key, selected))
        ) : currentQuestion.type === 'university' ? (
          renderDropdown(universityOptions, value, (selected) => updateFormData(currentQuestion.key, selected))
        ) : currentQuestion.type === 'roommateType' ? (
          renderDropdown(roommateTypeOptions, value, (selected) => updateFormData(currentQuestion.key, selected))
        ) : currentQuestion.type === 'city' ? (
          renderDropdown(cityOptions, value, (selected) => updateFormData(currentQuestion.key, selected))
        ) : currentQuestion.type === 'spaceType' ? (
          renderDropdown(spaceTypeOptions, value, (selected) => updateFormData(currentQuestion.key, selected))
        ) : currentQuestion.type === 'leaseDuration' ? (
          renderDropdown(leaseDurationOptions, value, (selected) => updateFormData(currentQuestion.key, selected))
        ) : currentQuestion.type === 'mapPin' ? (
          <View style={styles.mapPinContainer}>
            <Text style={styles.mapPinText}>Map pinning will be implemented</Text>
            <TouchableOpacity
              style={styles.mapPinButton}
              onPress={() => {
                // TODO: Open map to pin location
                // For now, skip this step
                handleNext();
              }}
            >
              <Text style={styles.mapPinButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        ) : currentQuestion.type === 'yesnodontcare' ? (
          renderButtonSelection(
            ['Yes', 'No', "Don't Care"],
            value,
            (selected) => updateFormData(currentQuestion.key, selected)
          )
        ) : currentQuestion.type === 'nightowl' ? (
          renderButtonSelection(
            ['Night Owl', 'Early Bird'],
            value,
            (selected) => updateFormData(currentQuestion.key, selected)
          )
        ) : currentQuestion.type === 'bio' ? (
          <View style={styles.bioContainer}>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us about yourself (10-50 words)"
              value={value}
              onChangeText={(text) => updateFormData(currentQuestion.key, text)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={[styles.wordCount, !bioValid && styles.wordCountError]}>
              {wordCount} / 10-50 words
            </Text>
          </View>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={`Enter ${currentQuestion.label.toLowerCase()}`}
            value={value}
            onChangeText={(text) => updateFormData(currentQuestion.key, text)}
            keyboardType={currentQuestion.type === 'email' ? 'email-address' : currentQuestion.type === 'phone' ? 'phone-pad' : currentQuestion.type === 'number' ? 'numeric' : 'default'}
            autoCapitalize={currentQuestion.type === 'text' ? 'words' : 'none'}
          />
        )}

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={24} color="#6F4E37" />
            <Text style={[styles.navButtonText, styles.backButtonText]}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton, (!bioValid || (currentQuestion.type === 'image' && !formData.profilePicture)) && styles.navButtonDisabled]}
            onPress={handleNext}
            disabled={!bioValid || (currentQuestion.type === 'image' && !formData.profilePicture)}
          >
            <Text style={[styles.navButtonText, styles.nextButtonText, (!bioValid || (currentQuestion.type === 'image' && !formData.profilePicture)) && styles.navButtonTextDisabled]}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color={(!bioValid || (currentQuestion.type === 'image' && !formData.profilePicture)) ? '#D3D3D3' : '#FFF5E1'} />
          </TouchableOpacity>
        </View>

        {/* Finish Later Link */}
        <TouchableOpacity
          style={styles.finishLaterContainer}
          onPress={handleFinishLater}
        >
          <Text style={styles.finishLaterText}>finish later</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderProgressBar()}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {(step === 0 || (step === 1 && userType === 'searcher' && !lookingFor)) ? renderSelectionScreen() : renderQuestionScreen()}
      </ScrollView>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select an option</Text>
              <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                <Ionicons name="close" size={24} color="#6F4E37" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={dropdownOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => selectDropdownOption(item)}
                >
                  <Text style={styles.dropdownOptionText}>{item}</Text>
                  {getFormValue(dropdownKey) === item && (
                    <Ionicons name="checkmark" size={20} color="#FF6B35" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1', // Beige/Cream
  },
  progressContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E8D5C4', // Light beige
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35', // Orange
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#6F4E37', // Espresso
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 36,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6F4E37', // Espresso
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 32,
  },
  buttonRow: {
    width: '100%',
    gap: 16,
  },
  buttonGrid: {
    width: '100%',
    gap: 16,
  },
  squareButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B35', // Orange
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  squareButtonSelected: {
    backgroundColor: '#FF6B35', // Orange
    borderColor: '#FF6B35',
  },
  squareButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35', // Orange
    textAlign: 'center',
  },
  squareButtonTextSelected: {
    color: '#FFF5E1', // Beige
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4', // Light beige
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#6F4E37', // Espresso
    marginBottom: 30,
  },
  imageUploadContainer: {
    width: '100%',
    marginBottom: 30,
  },
  imageUploadButton: {
    width: '100%',
  },
  imageUploadPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    alignItems: 'center',
  },
  imageUploadText: {
    marginTop: 4,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  dropdownButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  dropdownButtonText: {
    fontSize: 18,
    color: '#6F4E37',
  },
  dropdownButtonTextPlaceholder: {
    color: '#A68B7B',
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
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  dropdownOptionText: {
    fontSize: 18,
    color: '#6F4E37',
  },
  mapPinContainer: {
    width: '100%',
    marginBottom: 30,
    alignItems: 'center',
  },
  mapPinText: {
    fontSize: 16,
    color: '#A68B7B',
    marginBottom: 16,
    textAlign: 'center',
  },
  mapPinButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  mapPinButtonText: {
    color: '#FFF5E1',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  nextButton: {
    backgroundColor: '#FF6B35', // Orange
    flex: 1,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  backButtonText: {
    color: '#6F4E37', // Espresso
  },
  nextButtonText: {
    color: '#FFF5E1', // Beige
  },
  navButtonTextDisabled: {
    color: '#D3D3D3',
  },
  buttonSelectionContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 30,
  },
  selectionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B35', // Orange
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionButtonSelected: {
    backgroundColor: '#FF6B35', // Orange
    borderColor: '#FF6B35',
  },
  selectionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35', // Orange
  },
  selectionButtonTextSelected: {
    color: '#FFF5E1', // Beige
  },
  bioContainer: {
    width: '100%',
    marginBottom: 30,
  },
  bioInput: {
    minHeight: 120,
    paddingTop: 16,
  },
  wordCount: {
    marginTop: 8,
    fontSize: 14,
    color: '#6F4E37',
    textAlign: 'right',
  },
  wordCountError: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  finishLaterContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  finishLaterText: {
    fontSize: 16,
    color: '#6F4E37',
    textDecorationLine: 'underline',
  },
});
