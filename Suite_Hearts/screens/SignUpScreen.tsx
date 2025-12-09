import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@types';
import { Ionicons } from '@expo/vector-icons';
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
  });

  // Calculate total steps based on user type
  const getTotalSteps = () => {
    if (userType === 'homeowner') {
      return 24; // email, phone, name, age, race, gender, yearsExperience, job, profile, hometown, location, smoking, drinking, drugs, nightOwl, religion, bio, 5 questions
    } else {
      return 25; // email, phone, name, age, race, gender, university, job, profile, hometown, location, pets, smoking, drinking, drugs, nightOwl, religion, bio, 5 questions
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
      { key: 'age', label: 'What is your age?', type: 'number' },
      { key: 'race', label: 'What is your race?', type: 'text' },
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
      let customQuestions: string[] = [
        'Homeowner Question 1',
        'Homeowner Question 2',
        'Homeowner Question 3',
        'Homeowner Question 4',
        'Homeowner Question 5',
      ];

      return [
        ...baseQuestions,
        { key: 'yearsExperience', label: 'How many years of experience do you have renting/hosting?', type: 'number' },
        { key: 'job', label: 'What is your job?', type: 'text' },
        { key: 'profilePicture', label: 'Upload your profile picture', type: 'image' },
        { key: 'hometown', label: 'Where are you from?', type: 'text' },
        { key: 'location', label: 'Where are you based now?', type: 'text' },
        ...lifestyleQuestions,
        { key: 'question1', label: customQuestions[0], type: 'text' },
        { key: 'question2', label: customQuestions[1], type: 'text' },
        { key: 'question3', label: customQuestions[2], type: 'text' },
        { key: 'question4', label: customQuestions[3], type: 'text' },
        { key: 'question5', label: customQuestions[4], type: 'text' },
      ];
    } else {
      // Searcher questions
      let customQuestions: string[] = [];
      if (lookingFor === 'both') {
        customQuestions = [
          'Roommate + Housing Question 1',
          'Roommate + Housing Question 2',
          'Roommate + Housing Question 3',
          'Roommate + Housing Question 4',
          'Roommate + Housing Question 5',
        ];
      } else if (lookingFor === 'roommates') {
        customQuestions = [
          'Just Roommates Question 1',
          'Just Roommates Question 2',
          'Just Roommates Question 3',
          'Just Roommates Question 4',
          'Just Roommates Question 5',
        ];
      } else if (lookingFor === 'housing') {
        customQuestions = [
          'Just Housing Question 1',
          'Just Housing Question 2',
          'Just Housing Question 3',
          'Just Housing Question 4',
          'Just Housing Question 5',
        ];
      }

      return [
        ...baseQuestions,
        { key: 'university', label: 'What is your university affiliation? (Optional)', type: 'text' },
        { key: 'job', label: 'What is your job?', type: 'text' },
        { key: 'profilePicture', label: 'Upload your profile picture', type: 'image' },
        { key: 'hometown', label: 'Where are you from?', type: 'text' },
        { key: 'location', label: 'Where are you looking to live?', type: 'text' },
        { key: 'pets', label: 'Do you have pets?', type: 'yesnodontcare' },
        ...lifestyleQuestions,
        { key: 'question1', label: customQuestions[0], type: 'text' },
        { key: 'question2', label: customQuestions[1], type: 'text' },
        { key: 'question3', label: customQuestions[2], type: 'text' },
        { key: 'question4', label: customQuestions[3], type: 'text' },
        { key: 'question5', label: customQuestions[4], type: 'text' },
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
    return formData[key as keyof typeof formData] as string;
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
      createdAt: Date.now(),
    };

    await addUser(newUser);
    await setCurrentUser(newUser);
    navigation.navigate('Home');
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleImageUpload = () => {
    // Placeholder for image upload - in real app, use expo-image-picker
    setFormData({ ...formData, profilePicture: 'placeholder' });
    handleNext();
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
          <TouchableOpacity style={styles.imageUploadButton} onPress={handleImageUpload}>
            {formData.profilePicture ? (
              <View style={styles.imagePreview}>
                <Ionicons name="checkmark-circle" size={48} color="#FF6B35" />
                <Text style={styles.imageUploadText}>Photo uploaded</Text>
              </View>
            ) : (
              <View style={styles.imageUploadPlaceholder}>
                <Ionicons name="camera" size={48} color="#FF6B35" />
                <Text style={styles.imageUploadText}>Tap to upload photo</Text>
              </View>
            )}
          </TouchableOpacity>
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
            style={[styles.navButton, styles.backButton, questionIndex === 0 && styles.navButtonDisabled]}
            onPress={handleBack}
            disabled={questionIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color={questionIndex === 0 ? '#D3D3D3' : '#6F4E37'} />
            <Text style={[styles.navButtonText, styles.backButtonText, questionIndex === 0 && styles.navButtonTextDisabled]}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton, !bioValid && styles.navButtonDisabled]}
            onPress={handleNext}
            disabled={!bioValid}
          >
            <Text style={[styles.navButtonText, styles.nextButtonText, !bioValid && styles.navButtonTextDisabled]}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color={!bioValid ? '#D3D3D3' : '#FFF5E1'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderProgressBar()}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {(step === 0 || (step === 1 && userType === 'searcher' && !lookingFor)) ? renderSelectionScreen() : renderQuestionScreen()}
      </ScrollView>
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
  imageUploadButton: {
    width: '100%',
    marginBottom: 30,
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
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
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
});
