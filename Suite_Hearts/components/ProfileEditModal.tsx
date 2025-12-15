import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, ScrollView, FlatList, Image, Alert, Dimensions, Platform, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { User } from '../types';

interface ProfileEditModalProps {
  visible: boolean;
  field: string;
  value: any;
  user: User;
  onClose: () => void;
  onSave: (field: string, value: any) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ProfileEditModal({ visible, field, value, user, onClose, onSave }: ProfileEditModalProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedAge, setSelectedAge] = useState<number>(18);
  const [selectedMinBudget, setSelectedMinBudget] = useState<number>(600);
  const [selectedMaxBudget, setSelectedMaxBudget] = useState<number>(800);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('United States');
  const [loadingCities, setLoadingCities] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const ageScrollRef = useRef<ScrollView>(null);
  const minBudgetScrollRef = useRef<ScrollView>(null);
  const maxBudgetScrollRef = useRef<ScrollView>(null);
  const minBudgetScrollInitialized = useRef<boolean>(false);
  const maxBudgetScrollInitialized = useRef<boolean>(false);
  const isMinBudgetScrolling = useRef<boolean>(false);
  const isMaxBudgetScrolling = useRef<boolean>(false);
  const [jobRole, setJobRole] = useState<string>('');
  const [jobPlace, setJobPlace] = useState<string>('');
  const [selectedRoommates, setSelectedRoommates] = useState<number | string>(1);
  const roommatesScrollRef = useRef<ScrollView>(null);
  const roommatesScrollInitialized = useRef<boolean>(false);
  const isRoommatesScrolling = useRef<boolean>(false);
  const [selectedSpaceTypes, setSelectedSpaceTypes] = useState<string[]>([]);
  const [selectedFriendliness, setSelectedFriendliness] = useState<number>(5);
  const [selectedCleanliness, setSelectedCleanliness] = useState<number>(5);
  const friendlinessScrollRef = useRef<ScrollView>(null);
  const cleanlinessScrollRef = useRef<ScrollView>(null);
  const ageScrollInitialized = useRef<boolean>(false);
  const isScrolling = useRef<boolean>(false);

  useEffect(() => {
    if (visible) {
      // Reset scroll initialization flag when modal opens
      if (field === 'age') {
        ageScrollInitialized.current = false;
        isScrolling.current = false;
      }
      if (field === 'maxRoommates') {
        roommatesScrollInitialized.current = false;
        isRoommatesScrolling.current = false;
      }
      if (field === 'budget') {
        minBudgetScrollInitialized.current = false;
        maxBudgetScrollInitialized.current = false;
        isMinBudgetScrolling.current = false;
        isMaxBudgetScrolling.current = false;
      }
      
      if (field === 'budget' && typeof value === 'object' && value && 'minBudget' in value && 'maxBudget' in value) {
        const min = value.minBudget ? Number(value.minBudget) : 600;
        const max = value.maxBudget ? Number(value.maxBudget) : 800;
        setSelectedMinBudget(min);
        setSelectedMaxBudget(max);
      } else if (field === 'age') {
        const ageValue = typeof value === 'string' ? parseInt(value) : (value || 18);
        setSelectedAge(isNaN(ageValue) ? 18 : Math.max(17, Math.min(99, ageValue)));
      } else if (field === 'bio') {
        const bioValue = value || '';
        setInputValue(bioValue);
        setWordCount(bioValue.trim().split(/\s+/).filter((w: string) => w.length > 0).length);
      } else if (field === 'jobRole') {
        const jobRoleValue = value || (user.jobRole || '');
        setJobRole(String(jobRoleValue));
        setInputValue(String(jobRoleValue));
      } else if (field === 'jobPlace') {
        const jobPlaceValue = value || (user.jobPlace || '');
        setJobPlace(String(jobPlaceValue));
        setInputValue(String(jobPlaceValue));
      } else if (field === 'maxRoommates') {
        let roommatesValue: string | number = 1;
        if (typeof value === 'string') {
          // Handle old "None" or "6+" values
          if (value === 'None') {
            roommatesValue = 1;
          } else if (value === '6+') {
            roommatesValue = 6;
          } else {
            const numValue = parseInt(value);
            roommatesValue = isNaN(numValue) ? 1 : Math.max(1, Math.min(6, numValue));
          }
        } else if (typeof value === 'number') {
          roommatesValue = Math.max(1, Math.min(6, value));
        }
        setSelectedRoommates(roommatesValue);
      } else if (field === 'spaceType') {
        if (Array.isArray(value)) {
          setSelectedSpaceTypes(value);
        } else if (typeof value === 'string' && value) {
          // Try to parse if it's a JSON string
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              setSelectedSpaceTypes(parsed);
            } else {
              setSelectedSpaceTypes([value]);
            }
          } catch {
            setSelectedSpaceTypes([value]);
          }
        } else {
          setSelectedSpaceTypes([]);
        }
      } else if (field === 'friendliness') {
        const friendlinessValue = typeof value === 'string' ? parseInt(value) : (value || 5);
        setSelectedFriendliness(isNaN(friendlinessValue) ? 5 : Math.max(1, Math.min(10, friendlinessValue)));
      } else if (field === 'friendliness') {
        const friendlinessValue = typeof value === 'string' ? parseInt(value) : (value || 5);
        setSelectedFriendliness(isNaN(friendlinessValue) ? 5 : Math.max(1, Math.min(10, friendlinessValue)));
      } else if (field === 'cleanliness') {
        const cleanlinessValue = typeof value === 'string' ? parseInt(value) : (value || 5);
        setSelectedCleanliness(isNaN(cleanlinessValue) ? 5 : Math.max(1, Math.min(10, cleanlinessValue)));
      } else if (field === 'guestsAllowed') {
        setSelectedOption(value || '');
      } else if (typeof value === 'string' || typeof value === 'number') {
        setInputValue(String(value || ''));
        setSelectedOption(String(value || ''));
      } else {
        setInputValue('');
        setSelectedOption('');
      }
    }
  }, [visible, field, value]);

  // Handle age picker scroll initialization separately
  useEffect(() => {
    if (visible && field === 'age' && ageScrollRef.current && !ageScrollInitialized.current) {
      const ages = Array.from({ length: 83 }, (_, i) => i + 17);
      const index = ages.indexOf(selectedAge);
      if (index >= 0) {
        ageScrollInitialized.current = true;
        setTimeout(() => {
          if (ageScrollRef.current && !isScrolling.current) {
            ageScrollRef.current.scrollTo({
              y: index * 50,
              animated: false,
            });
          }
        }, 150);
      }
    }
    if (!visible && field === 'age') {
      ageScrollInitialized.current = false;
    }
  }, [visible, field, selectedAge]);

  // Handle roommates picker scroll initialization separately
  useEffect(() => {
    if (visible && field === 'maxRoommates' && roommatesScrollRef.current && !roommatesScrollInitialized.current) {
      const roommatesOptions = ['1', '2', '3', '4', '5', '6'];
      const selectedValue = typeof selectedRoommates === 'number' ? String(selectedRoommates) : String(selectedRoommates);
      const index = roommatesOptions.indexOf(selectedValue);
      if (index >= 0) {
        roommatesScrollInitialized.current = true;
        setTimeout(() => {
          if (roommatesScrollRef.current && !isRoommatesScrolling.current) {
            roommatesScrollRef.current.scrollTo({
              y: index * 50,
              animated: false,
            });
          }
        }, 150);
      }
    }
    if (!visible && field === 'maxRoommates') {
      roommatesScrollInitialized.current = false;
    }
  }, [visible, field, selectedRoommates]);

  // Handle budget pickers scroll initialization separately
  useEffect(() => {
    if (visible && field === 'budget') {
      // Generate budget options
      const minBudgetOptions: (number | string)[] = [];
      for (let i = 600; i <= 4000; i += 200) {
        minBudgetOptions.push(i);
      }
      minBudgetOptions.push('4000+');
      
      const maxBudgetOptions: (number | string)[] = [];
      for (let i = 800; i <= 6000; i += 200) {
        maxBudgetOptions.push(i);
      }
      maxBudgetOptions.push('6000+');

      // Initialize min budget scroll
      if (minBudgetScrollRef.current && !minBudgetScrollInitialized.current) {
        const minIndex = minBudgetOptions.findIndex(opt => {
          const optValue = typeof opt === 'number' ? opt : 4000;
          return optValue === selectedMinBudget;
        });
        if (minIndex >= 0) {
          minBudgetScrollInitialized.current = true;
          setTimeout(() => {
            if (minBudgetScrollRef.current && !isMinBudgetScrolling.current) {
              minBudgetScrollRef.current.scrollTo({
                y: minIndex * 50,
                animated: false,
              });
            }
          }, 150);
        }
      }

      // Initialize max budget scroll
      if (maxBudgetScrollRef.current && !maxBudgetScrollInitialized.current) {
        const maxIndex = maxBudgetOptions.findIndex(opt => {
          const optValue = typeof opt === 'number' ? opt : 6000;
          return optValue === selectedMaxBudget;
        });
        if (maxIndex >= 0) {
          maxBudgetScrollInitialized.current = true;
          setTimeout(() => {
            if (maxBudgetScrollRef.current && !isMaxBudgetScrolling.current) {
              maxBudgetScrollRef.current.scrollTo({
                y: maxIndex * 50,
                animated: false,
              });
            }
          }, 150);
        }
      }
    }
    if (!visible && field === 'budget') {
      minBudgetScrollInitialized.current = false;
      maxBudgetScrollInitialized.current = false;
    }
  }, [visible, field, selectedMinBudget, selectedMaxBudget]);

  const getFieldConfig = () => {
    const configs: Record<string, { label: string; type: string; options?: string[]; placeholder?: string; min?: number; max?: number; labels?: { min?: string; max?: string } }> = {
      age: { label: 'Age', type: 'agePicker' },
      race: {
        label: 'Race',
        type: 'dropdown',
        options: [
          'Black/African American',
          'White/Caucasian',
          'Hispanic/Latino',
          'East Asian',
          'South Asian',
          'Southeast Asian',
          'Middle Eastern',
          'Native Hawaiian',
          'Other Pacific Islander',
          'Alaska Native',
          'Multiple/Mixed Ethnicity',
          'Other',
        ],
      },
      gender: {
        label: 'Gender',
        type: 'dropdown',
        options: [
          'Woman',
          'Man',
          'Non-binary',
          'Transgender Woman',
          'Transgender Man',
          'Other',
          'Prefer Not to Answer',
        ],
      },
      jobRole: { label: 'Occupation', type: 'jobRole', placeholder: 'occupation' },
      jobPlace: { label: 'Workplace', type: 'jobPlace', placeholder: 'workplace' },
      university: {
        label: 'University',
        type: 'dropdown',
        options: ['Stanford', 'Berkeley', 'USF', 'SJSU'],
      },
      yearsExperience: { label: 'Host Experience', type: 'number', placeholder: 'Enter years' },
      hometown: { label: 'Hometown', type: 'text', placeholder: 'City, Country' },
      location: { label: 'Location', type: 'location', placeholder: 'Use your current location' },
      smoking: {
        label: 'Do you smoke?',
        type: 'dropdown',
        options: ['Never', 'Rarely', 'Sometimes', 'Often'],
      },
      drinking: {
        label: 'Do you drink?',
        type: 'dropdown',
        options: ['Never', 'Rarely', 'Sometimes', 'Often'],
      },
      drugs: {
        label: 'Do you use drugs?',
        type: 'dropdown',
        options: ['Never', 'Rarely', 'Sometimes', 'Often'],
      },
      nightOwl: {
        label: 'Sleep Schedule',
        type: 'dropdown',
        options: ['Night Owl', 'Early Bird', 'Both'],
      },
      friendliness: {
        label: 'How friendly do you want to be with your roommates?',
        type: 'slider',
        min: 1,
        max: 10,
        labels: { min: 'Cordial co-habitants', max: 'Best friends' },
      },
      cleanliness: {
        label: 'How clean are you?',
        type: 'slider',
        min: 1,
        max: 10,
        labels: { min: 'Messy', max: 'Neat freak' },
      },
      guestsAllowed: {
        label: 'Are guests allowed over?',
        type: 'dropdown',
        options: ['never', 'with permission', 'always okay'],
      },
      religion: {
        label: 'Religion',
        type: 'dropdown',
        options: [
          'Christian',
          'Jewish',
          'Muslim',
          'Hindu',
          'Buddhist',
          'Atheist',
          'Agnostic',
          'Spiritual',
          'Other',
          'Prefer Not to Answer',
        ],
      },
      bio: {
        label: 'Bio',
        type: 'textarea',
        placeholder: 'Mention what you are looking for or anything people should know (minimum 10 words)',
      },
      pets: {
        label: 'Do you have pets?',
        type: 'dropdown',
        options: ['Yes', 'No'],
      },
      maxRoommates: {
        label: 'Max Housemates',
        type: 'roommatesPicker',
      },
      roommateType: {
        label: 'Roommate Type',
        type: 'dropdown',
        options: ['Roommates', 'Suitemates', 'Both'],
      },
      preferredCity: {
        label: 'Preferred City',
        type: 'dropdown',
        options: ['San Francisco', 'Berkeley', 'Palo Alto', 'San Jose'],
      },
      spaceType: {
        label: 'Space Type',
        type: 'checklist',
        options: ['RV', 'Townhome', 'Condo', 'House', 'Apartment', 'Other'],
      },
      leaseDuration: {
        label: 'Lease Duration',
        type: 'dropdown',
        options: [
          'Under 1 month',
          '1 month',
          '2 months',
          '3 months',
          '4 months',
          '5 months',
          '6 months',
          '7 months',
          '8 months',
          '9 months',
          '10 months',
          '11 months',
          '12 months',
          '1 year +',
        ],
      },
      budget: { label: 'Monthly Budget', type: 'budget', placeholder: 'Enter budget range' },
      profilePicture: { label: 'Profile Picture', type: 'image' },
    };
    return configs[field] || { label: field, type: 'text' };
  };

  const config = getFieldConfig();

  const fetchCities = async (country: string = 'United States') => {
    setLoadingCities(true);
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country }),
      });
      const data = await response.json();
      if (data.error === false && data.data) {
        setCities(data.data.sort());
      } else {
        Alert.alert('Error', 'Failed to load cities. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      Alert.alert('Error', 'Failed to load cities. Please try again.');
    } finally {
      setLoadingCities(false);
    }
  };

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant location permissions to use your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        const locationString = `${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
        onSave('location', locationString);
        onClose();
      } else {
        onSave('location', `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        onClose();
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
  };

  const handleSave = () => {
    if (config.type === 'budget') {
      if (selectedMaxBudget < selectedMinBudget) {
        Alert.alert('Invalid Budget', 'Maximum budget must be greater than or equal to minimum budget.');
        return;
      }
        onSave(field, { minBudget: selectedMinBudget, maxBudget: selectedMaxBudget });
    } else if (config.type === 'agePicker') {
      onSave(field, String(selectedAge));
    } else if (config.type === 'roommatesPicker') {
      // Save as number 1-6
      const numValue = typeof selectedRoommates === 'number' 
        ? selectedRoommates 
        : parseInt(String(selectedRoommates)) || 1;
      onSave(field, Math.max(1, Math.min(6, numValue)));
    } else if (config.type === 'checklist') {
      onSave(field, selectedSpaceTypes);
    } else if (config.type === 'slider') {
      if (field === 'friendliness') {
        onSave(field, selectedFriendliness);
      } else if (field === 'cleanliness') {
        onSave(field, selectedCleanliness);
      }
    } else if (config.type === 'jobRole' || config.type === 'jobPlace') {
      onSave(field, inputValue.trim());
    } else if (config.type === 'dropdown') {
      if (!selectedOption) {
        Alert.alert('Required', `Please select a ${config.label.toLowerCase()}.`);
        return;
      }
      // Handle leaseDuration special case
      if (field === 'leaseDuration') {
        if (selectedOption === 'Under 1 month') {
          onSave(field, 'Under 1 month');
        } else {
          const months = parseInt(selectedOption);
          onSave(field, isNaN(months) ? selectedOption : months);
        }
      } else {
        onSave(field, selectedOption);
      }
    } else if (config.type === 'textarea') {
      const words = inputValue.trim().split(/\s+/).filter((w: string) => w.length > 0);
      if (words.length < 10) {
        Alert.alert('Bio Too Short', 'Your bio must be at least 10 words. Please add more details.');
        return;
      }
      onSave(field, inputValue.trim());
    } else if (config.type === 'image') {
      return; // Handled separately
    } else if (config.type === 'location') {
      handleGetLocation();
      return;
    } else {
      if (!inputValue.trim() && config.type !== 'citySearch' && config.type !== 'jobRole' && config.type !== 'jobPlace') {
        Alert.alert('Required', `Please enter your ${config.label.toLowerCase()}.`);
        return;
      }
      if (config.type === 'number') {
        const num = parseInt(inputValue);
        if (isNaN(num) || num < 0) {
          Alert.alert('Invalid Input', 'Please enter a valid number.');
          return;
        }
        onSave(field, num);
      } else {
        onSave(field, inputValue.trim());
      }
    }
    onClose();
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
      onSave('profilePicture', result.assets[0].uri);
      onClose();
    }
  };

  const handleBioChange = (text: string) => {
    setInputValue(text);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  };

  const renderInput = () => {
    if (config.type === 'image') {
      return (
        <View style={styles.imageContainer}>
          {value ? (
            <Image source={{ uri: value }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={48} color="#A68B7B" />
            </View>
          )}
          <TouchableOpacity style={styles.imageButton} onPress={handleImagePicker}>
            <Text style={styles.imageButtonText}>Choose Photo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (config.type === 'agePicker') {
      const ages = Array.from({ length: 83 }, (_, i) => i + 17);

      return (
        <View style={styles.agePickerContainer}>
          <ScrollView
            ref={ageScrollRef}
            style={styles.ageScrollView}
            contentContainerStyle={styles.ageScrollContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={50}
            decelerationRate="fast"
            onScrollBeginDrag={() => {
              isScrolling.current = true;
            }}
            onMomentumScrollEnd={(e) => {
              isScrolling.current = false;
              const y = e.nativeEvent.contentOffset.y;
              const index = Math.round(y / 50);
              const age = ages[Math.max(0, Math.min(ages.length - 1, index))];
              if (selectedAge !== age) {
                setSelectedAge(age);
              }
            }}
            onScrollEndDrag={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              const index = Math.round(y / 50);
              const age = ages[Math.max(0, Math.min(ages.length - 1, index))];
              if (selectedAge !== age) {
                setSelectedAge(age);
              }
              // Snap to position
              if (ageScrollRef.current) {
                ageScrollRef.current.scrollTo({
                  y: index * 50,
                  animated: true,
                });
              }
            }}
          >
            {ages.map((age) => (
              <TouchableOpacity
                key={age}
                style={styles.ageItem}
                onPress={() => {
                  isScrolling.current = false;
                  setSelectedAge(age);
                  const index = ages.indexOf(age);
                  if (index >= 0 && ageScrollRef.current) {
                    ageScrollRef.current.scrollTo({
                      y: index * 50,
                      animated: true,
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.ageItemContent}>
                  <Text style={[styles.ageText, selectedAge === age && styles.ageTextSelected]}>
                    {age}
                  </Text>
                </View>
                {age < 99 && <View style={styles.ageDivider} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (config.type === 'location') {
      return (
        <View style={styles.locationContainer}>
          <TouchableOpacity style={styles.locationButton} onPress={handleGetLocation}>
            <Ionicons name="location" size={24} color="#FFF5E1" />
            <Text style={styles.locationButtonText}>Use Current Location</Text>
          </TouchableOpacity>
          <Text style={styles.locationHint}>
            This will use your phone's GPS to set your location
          </Text>
        </View>
      );
    }

    if (config.type === 'jobRole' || config.type === 'jobPlace') {
      return (
        <View style={styles.jobContainer}>
          <TextInput
            style={styles.jobInput}
            placeholder={config.placeholder}
            placeholderTextColor="#A68B7B"
            value={inputValue}
            onChangeText={setInputValue}
          />
        </View>
      );
    }

    if (config.type === 'roommatesPicker') {
      const roommatesOptions = ['1', '2', '3', '4', '5', '6'];

      return (
        <View style={styles.agePickerContainer}>
          <ScrollView
            ref={roommatesScrollRef}
            style={styles.ageScrollView}
            contentContainerStyle={styles.ageScrollContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={50}
            decelerationRate="fast"
            onScrollBeginDrag={() => {
              isRoommatesScrolling.current = true;
            }}
            onMomentumScrollEnd={(e) => {
              isRoommatesScrolling.current = false;
              const y = e.nativeEvent.contentOffset.y;
              const index = Math.round(y / 50);
              const roommates = roommatesOptions[Math.max(0, Math.min(roommatesOptions.length - 1, index))];
              const numValue = parseInt(roommates);
              if (selectedRoommates !== numValue) {
                setSelectedRoommates(numValue);
              }
            }}
            onScrollEndDrag={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              const index = Math.round(y / 50);
              const roommates = roommatesOptions[Math.max(0, Math.min(roommatesOptions.length - 1, index))];
              const numValue = parseInt(roommates);
              if (selectedRoommates !== numValue) {
                setSelectedRoommates(numValue);
              }
              // Snap to position
              if (roommatesScrollRef.current) {
                roommatesScrollRef.current.scrollTo({
                  y: index * 50,
                  animated: true,
                });
              }
            }}
          >
            {roommatesOptions.map((option, index) => {
              const numValue = parseInt(option);
              const isSelected = selectedRoommates === numValue || String(selectedRoommates) === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.ageItem}
                  onPress={() => {
                    isRoommatesScrolling.current = false;
                    setSelectedRoommates(numValue);
                    if (roommatesScrollRef.current) {
                      roommatesScrollRef.current.scrollTo({
                        y: index * 50,
                        animated: true,
                      });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.ageItemContent}>
                    <Text style={[styles.ageText, isSelected && styles.ageTextSelected]}>
                      {option}
                    </Text>
                  </View>
                  {index < roommatesOptions.length - 1 && <View style={styles.ageDivider} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      );
    }

    if (config.type === 'checklist') {
      return (
        <View style={styles.checklistContainer}>
          {(config.options || []).map((item) => {
            const isSelected = selectedSpaceTypes.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.checklistItem, isSelected && styles.checklistItemSelected]}
                onPress={() => {
                  if (isSelected) {
                    setSelectedSpaceTypes(selectedSpaceTypes.filter(s => s !== item));
                  } else {
                    setSelectedSpaceTypes([...selectedSpaceTypes, item]);
                  }
                }}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFF5E1" />}
                </View>
                <Text style={[styles.checklistText, isSelected && styles.checklistTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (config.type === 'slider') {
      const min = (config as any).min || 1;
      const max = (config as any).max || 10;
      const labels = (config as any).labels || {};
      const selectedValue = field === 'friendliness' ? selectedFriendliness : selectedCleanliness;
      const setSelectedValue = field === 'friendliness' ? setSelectedFriendliness : setSelectedCleanliness;
      const sliderTrackRef = useRef<View>(null);

      const handleSliderPress = (event: any) => {
        if (sliderTrackRef.current) {
          sliderTrackRef.current.measure((x, y, width, height, pageX, pageY) => {
            const touchX = event.nativeEvent.pageX - pageX;
            const percentage = Math.max(0, Math.min(1, touchX / width));
            const value = Math.round(min + percentage * (max - min));
            setSelectedValue(value);
          });
        }
      };

      const panResponder = useRef(
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (event) => {
            handleSliderPress(event);
          },
          onPanResponderMove: (event) => {
            handleSliderPress(event);
          },
          onPanResponderRelease: () => {},
        })
      ).current;

      const sliderPosition = ((selectedValue - min) / (max - min)) * 100;

      return (
        <View style={styles.sliderContainer}>
          <View style={styles.sliderLabelsRow}>
            {labels.min && (
              <Text style={styles.sliderLabel}>{labels.min}</Text>
            )}
            <Text style={styles.sliderValue}>{selectedValue}</Text>
            {labels.max && (
              <Text style={styles.sliderLabelRight}>{labels.max}</Text>
            )}
          </View>
          <View 
            style={styles.sliderTrack}
            ref={sliderTrackRef}
            {...panResponder.panHandlers}
          >
            <View style={styles.sliderBackground} />
            <View 
              style={[
                styles.sliderFill, 
                { width: `${sliderPosition}%` }
              ]} 
            />
            <View 
              style={[
                styles.sliderThumb,
                { left: `${sliderPosition}%` }
              ]}
            />
            {/* Clickable area for each number */}
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((value) => {
              const position = ((value - min) / (max - min)) * 100;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.sliderTick,
                    { left: `${position}%` }
                  ]}
                  onPress={() => setSelectedValue(value)}
                  activeOpacity={0.7}
                />
              );
            })}
          </View>
          <View style={styles.sliderNumbersRow}>
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((value) => (
              <TouchableOpacity
                key={value}
                style={styles.sliderNumber}
                onPress={() => setSelectedValue(value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sliderNumberText,
                  selectedValue === value && styles.sliderNumberTextSelected
                ]}>
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (config.type === 'dropdown') {
      return (
        <View style={styles.dropdownContainer}>
          {(config.options || []).map((item, index) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.optionItem,
                selectedOption === item && styles.optionItemSelected,
                index === (config.options?.length || 0) - 1 && styles.lastOptionItem,
              ]}
              onPress={() => setSelectedOption(item)}
            >
              <Text style={[styles.optionText, selectedOption === item && styles.optionTextSelected]}>
                {item}
              </Text>
              {selectedOption === item && (
                <Ionicons name="checkmark" size={24} color="#FFF5E1" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (config.type === 'budget') {
      // Generate budget options
      const minBudgetOptions: (number | string)[] = [];
      for (let i = 600; i <= 4000; i += 200) {
        minBudgetOptions.push(i);
      }
      minBudgetOptions.push('4000+');
      
      const maxBudgetOptions: (number | string)[] = [];
      for (let i = 800; i <= 6000; i += 200) {
        maxBudgetOptions.push(i);
      }
      maxBudgetOptions.push('6000+');

      return (
        <View style={styles.budgetContainer}>
          <Text style={styles.budgetSectionLabel}>Minimum Monthly Budget</Text>
          <View style={styles.agePickerContainer}>
            <ScrollView
              ref={minBudgetScrollRef}
              style={styles.ageScrollView}
              contentContainerStyle={styles.ageScrollContent}
              showsVerticalScrollIndicator={false}
              snapToInterval={50}
              decelerationRate="fast"
              onScrollBeginDrag={() => {
                isMinBudgetScrolling.current = true;
              }}
              onMomentumScrollEnd={(e) => {
                isMinBudgetScrolling.current = false;
                const y = e.nativeEvent.contentOffset.y;
                const index = Math.round(y / 50);
                const value = minBudgetOptions[Math.max(0, Math.min(minBudgetOptions.length - 1, index))];
                const optionValue = typeof value === 'number' ? value : 4000;
                if (selectedMinBudget !== optionValue) {
                  setSelectedMinBudget(optionValue);
                }
              }}
              onScrollEndDrag={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                const index = Math.round(y / 50);
                const value = minBudgetOptions[Math.max(0, Math.min(minBudgetOptions.length - 1, index))];
                const optionValue = typeof value === 'number' ? value : 4000;
                if (!isMinBudgetScrolling.current) {
                  isMinBudgetScrolling.current = false;
                  setSelectedMinBudget(optionValue);
                  if (minBudgetScrollRef.current) {
                    minBudgetScrollRef.current.scrollTo({
                      y: index * 50,
                      animated: true,
                    });
                  }
                }
              }}
            >
              {minBudgetOptions.map((option) => {
                const optionValue = typeof option === 'number' ? option : 4000;
                const displayText = typeof option === 'number' ? `$${option}` : '$4000+';
                return (
                  <TouchableOpacity
                    key={option}
                    style={styles.ageItem}
                    onPress={() => {
                      setSelectedMinBudget(optionValue);
                      const index = minBudgetOptions.indexOf(option);
                      if (index >= 0 && minBudgetScrollRef.current) {
                        minBudgetScrollRef.current.scrollTo({
                          y: index * 50,
                          animated: true,
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ageItemContent}>
                      <Text style={[styles.ageText, selectedMinBudget === optionValue && styles.ageTextSelected]}>
                        {displayText}
                      </Text>
                    </View>
                    {option !== minBudgetOptions[minBudgetOptions.length - 1] && <View style={styles.ageDivider} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <Text style={styles.budgetSectionLabel}>Maximum Monthly Budget</Text>
          <View style={styles.agePickerContainer}>
            <ScrollView
              ref={maxBudgetScrollRef}
              style={styles.ageScrollView}
              contentContainerStyle={styles.ageScrollContent}
              showsVerticalScrollIndicator={false}
              snapToInterval={50}
              decelerationRate="fast"
              onScrollBeginDrag={() => {
                isMaxBudgetScrolling.current = true;
              }}
              onMomentumScrollEnd={(e) => {
                isMaxBudgetScrolling.current = false;
                const y = e.nativeEvent.contentOffset.y;
                const index = Math.round(y / 50);
                const value = maxBudgetOptions[Math.max(0, Math.min(maxBudgetOptions.length - 1, index))];
                const optionValue = typeof value === 'number' ? value : 6000;
                if (selectedMaxBudget !== optionValue) {
                  setSelectedMaxBudget(optionValue);
                }
              }}
              onScrollEndDrag={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                const index = Math.round(y / 50);
                const value = maxBudgetOptions[Math.max(0, Math.min(maxBudgetOptions.length - 1, index))];
                const optionValue = typeof value === 'number' ? value : 6000;
                if (!isMaxBudgetScrolling.current) {
                  isMaxBudgetScrolling.current = false;
                  setSelectedMaxBudget(optionValue);
                  if (maxBudgetScrollRef.current) {
                    maxBudgetScrollRef.current.scrollTo({
                      y: index * 50,
                      animated: true,
                    });
                  }
                }
              }}
            >
              {maxBudgetOptions.map((option) => {
                const optionValue = typeof option === 'number' ? option : 6000;
                const displayText = typeof option === 'number' ? `$${option}` : '$6000+';
                return (
                  <TouchableOpacity
                    key={option}
                    style={styles.ageItem}
                    onPress={() => {
                      setSelectedMaxBudget(optionValue);
                      const index = maxBudgetOptions.indexOf(option);
                      if (index >= 0 && maxBudgetScrollRef.current) {
                        maxBudgetScrollRef.current.scrollTo({
                          y: index * 50,
                          animated: true,
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ageItemContent}>
                      <Text style={[styles.ageText, selectedMaxBudget === optionValue && styles.ageTextSelected]}>
                        {displayText}
                      </Text>
                    </View>
                    {option !== maxBudgetOptions[maxBudgetOptions.length - 1] && <View style={styles.ageDivider} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      );
    }

    return (
      <View>
        <TextInput
          style={[styles.input, config.type === 'textarea' && styles.textArea]}
          placeholder={config.placeholder || `Enter your ${config.label.toLowerCase()}`}
          placeholderTextColor="#A68B7B"
          value={inputValue}
          onChangeText={config.type === 'textarea' ? handleBioChange : setInputValue}
          multiline={config.type === 'textarea'}
          numberOfLines={config.type === 'textarea' ? 6 : 1}
          keyboardType={config.type === 'number' ? 'numeric' : 'default'}
          textAlignVertical={config.type === 'textarea' ? 'top' : 'center'}
        />
        {config.type === 'textarea' && (
          <Text style={[styles.wordCount, wordCount < 10 && styles.wordCountWarning]}>
            {wordCount}/10 words {wordCount < 10 && '(minimum 10 words required)'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{config.label}</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#6F4E37" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScrollView}>
              {renderInput()}
            </ScrollView>
          </View>

          {config.type !== 'image' && config.type !== 'location' && (
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFF5E1',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.75,
    paddingTop: 20,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6F4E37',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  modalBody: {
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
    padding: 20,
  },
  dropdownContainer: {
    flex: 1,
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
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  wordCount: {
    fontSize: 12,
    color: '#6F4E37',
    marginTop: -16,
    marginBottom: 20,
    textAlign: 'right',
  },
  wordCountWarning: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  optionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  lastOptionItem: {
    marginBottom: 0,
  },
  optionItemSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  optionText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFF5E1',
  },
  agePickerContainer: {
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D5C4',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  ageScrollView: {
    flex: 1,
  },
  ageScrollContent: {
    paddingVertical: 75,
  },
  ageItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageItemContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageText: {
    fontSize: 20,
    color: '#A68B7B',
    fontWeight: '400',
  },
  ageTextSelected: {
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: 24,
  },
  ageDivider: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: '#E8D5C4',
  },
  ageIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  ageIndicatorLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#E8D5C4',
  },
  ageIndicatorLineTop: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: '80%',
    height: 1,
    backgroundColor: '#E8D5C4',
  },
  ageIndicatorLineBottom: {
    position: 'absolute',
    top: '50%',
    marginTop: 25,
    width: '80%',
    height: 1,
    backgroundColor: '#E8D5C4',
  },
  ageIndicatorText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF6B35',
    marginVertical: 8,
  },
  budgetContainer: {
    gap: 24,
  },
  budgetSectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F4E37',
    width: 60,
  },
  budgetInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#6F4E37',
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  budgetHint: {
    fontSize: 12,
    color: '#A68B7B',
    marginTop: -8,
    marginBottom: 8,
  },
  jobContainer: {
    gap: 8,
    marginBottom: 20,
  },
  jobInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#6F4E37',
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  checklistContainer: {
    gap: 12,
    marginBottom: 20,
  },
  checklistItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  checklistItemSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFE5D9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checklistText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
    flex: 1,
  },
  checklistTextSelected: {
    color: '#6F4E37',
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 20,
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
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#A68B7B',
    borderStyle: 'dashed',
  },
  imageButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
  },
  imageButtonText: {
    color: '#FFF5E1',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  locationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  locationButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 250,
    justifyContent: 'center',
  },
  locationButtonText: {
    color: '#FFF5E1',
    fontSize: 16,
    fontWeight: '600',
  },
  locationHint: {
    fontSize: 12,
    color: '#A68B7B',
    marginTop: 12,
    textAlign: 'center',
  },
  citySearchContainer: {
    marginBottom: 20,
  },
  countryButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  countryButtonText: {
    color: '#FFF5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
    marginBottom: 12,
  },
  citiesList: {
    maxHeight: 300,
    marginBottom: 12,
  },
  cityItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  cityItemSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  cityText: {
    fontSize: 14,
    color: '#6F4E37',
  },
  cityTextSelected: {
    color: '#FFF5E1',
  },
  sliderContainer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#A68B7B',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  sliderLabelRight: {
    fontSize: 14,
    color: '#A68B7B',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    minWidth: 50,
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8D5C4',
    position: 'relative',
    marginBottom: 30,
    width: '100%',
  },
  sliderBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
    backgroundColor: '#E8D5C4',
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    borderWidth: 3,
    borderColor: '#FFF5E1',
    marginLeft: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  sliderTick: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    backgroundColor: 'transparent',
  },
  sliderNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  sliderNumber: {
    padding: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  sliderNumberText: {
    fontSize: 14,
    color: '#A68B7B',
    fontWeight: '500',
  },
  sliderNumberTextSelected: {
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8D5C4',
    backgroundColor: '#FFF5E1',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  cancelButtonText: {
    color: '#6F4E37',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF5E1',
    fontSize: 16,
    fontWeight: '600',
  },
});
