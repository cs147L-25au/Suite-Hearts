import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Linking, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types';
import { useUser } from '../context/UserContext';

type ConversationScreenRouteProp = RouteProp<RootStackParamList, 'Conversation'>;

export default function ConversationScreen() {
  const route = useRoute<ConversationScreenRouteProp>();
  const navigation = useNavigation();
  const { userId, userName } = route.params;
  const { currentUser, getConversation, sendMessage, getUserById } = useUser();
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text>No user found</Text>
      </View>
    );
  }

  const conversation = getConversation(currentUser.id, userId);
  const otherUser = getUserById(userId);

  useEffect(() => {
    if (conversation && conversation.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation?.messages.length]);

  const handleSend = async () => {
    if (messageText.trim() && currentUser) {
      await sendMessage(currentUser.id, userId, messageText.trim());
      setMessageText('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSendImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to send images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0] && currentUser) {
        // TODO: Upload image to Supabase storage first, then send message with imageUrl
        // For now, we'll send the local URI (in production, upload to storage first)
        const imageUri = result.assets[0].uri;
        await sendMessage(currentUser.id, userId, '', imageUri);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleCall = () => {
    if (!otherUser?.phone) {
      Alert.alert('No phone number', 'This user has not provided a phone number.');
      return;
    }

    const phoneNumber = otherUser.phone.replace(/\D/g, ''); // Remove non-digits
    const phoneUrl = `tel:${phoneNumber}`;
    
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Unable to make phone call.');
        }
      })
      .catch((err) => {
        console.error('Error opening phone:', err);
        Alert.alert('Error', 'Unable to make phone call.');
      });
  };

  const handleFaceTime = () => {
    if (!otherUser?.phone) {
      Alert.alert('No phone number', 'This user has not provided a phone number.');
      return;
    }

    const phoneNumber = otherUser.phone.replace(/\D/g, ''); // Remove non-digits
    
    if (Platform.OS === 'ios') {
      // iOS FaceTime
      const facetimeUrl = `facetime://${phoneNumber}`;
      Linking.canOpenURL(facetimeUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(facetimeUrl);
          } else {
            // Fallback to phone call
            handleCall();
          }
        })
        .catch(() => handleCall());
    } else {
      // Android - open phone dialer
      handleCall();
    }
  };

  const handleAddContact = () => {
    if (!otherUser?.phone) {
      Alert.alert('No phone number', 'This user has not provided a phone number.');
      return;
    }

    const phoneNumber = otherUser.phone.replace(/\D/g, '');
    
    if (Platform.OS === 'ios') {
      // iOS - open add contact
      const contactUrl = `contacts://?name=${encodeURIComponent(otherUser.name)}&phone=${phoneNumber}`;
      Linking.canOpenURL(contactUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(contactUrl);
          } else {
            Alert.alert('Add Contact', `Name: ${otherUser.name}\nPhone: ${otherUser.phone}`, [
              { text: 'OK' }
            ]);
          }
        })
        .catch(() => {
          Alert.alert('Add Contact', `Name: ${otherUser.name}\nPhone: ${otherUser.phone}`, [
            { text: 'OK' }
          ]);
        });
    } else {
      // Android - open add contact
      const contactUrl = `content://contacts/people/`;
      Linking.canOpenURL(contactUrl)
        .then(() => {
          Alert.alert('Add Contact', `Name: ${otherUser.name}\nPhone: ${otherUser.phone}`, [
            { text: 'OK' }
          ]);
        })
        .catch(() => {
          Alert.alert('Add Contact', `Name: ${otherUser.name}\nPhone: ${otherUser.phone}`, [
            { text: 'OK' }
          ]);
        });
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMyMessage = item.senderId === currentUser.id;

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} resizeMode="cover" />
          ) : null}
          {item.text ? (
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
              {item.text}
            </Text>
          ) : null}
          <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#6F4E37" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{userName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleCall} style={styles.headerButton}>
            <Ionicons name="call" size={24} color="#6F4E37" />
          </TouchableOpacity>
          {Platform.OS === 'ios' && (
            <TouchableOpacity onPress={handleFaceTime} style={styles.headerButton}>
              <Ionicons name="videocam" size={24} color="#6F4E37" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleAddContact} style={styles.headerButton}>
            <Ionicons name="person-add" size={24} color="#6F4E37" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={conversation?.messages || []}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={handleSendImage} style={styles.cameraButton}>
          <Ionicons name="camera" size={24} color="#6F4E37" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="iMessage"
            placeholderTextColor="#A68B7B"
            multiline
            maxLength={1000}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Ionicons 
            name="arrow-up-circle" 
            size={32} 
            color={messageText.trim() ? '#6F4E37' : '#E8D5C4'} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE5D4', // Light orange background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF5E1', // Cream header
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8D5C4',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 4,
    flexDirection: 'row',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    padding: 10,
    paddingHorizontal: 12,
  },
  myMessage: {
    backgroundColor: '#6F4E37', // Brown bubble
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#FFF5E1', // Cream bubble
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF', // White text on brown
  },
  otherMessageText: {
    color: '#000000', // Black text on cream
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
  otherTimestamp: {
    color: '#6F4E37',
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    backgroundColor: '#FFF5E1',
    borderTopWidth: 0.5,
    borderTopColor: '#E8D5C4',
    gap: 8,
  },
  cameraButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8D5C4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 16,
    color: '#000000',
    padding: 0,
    minHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
