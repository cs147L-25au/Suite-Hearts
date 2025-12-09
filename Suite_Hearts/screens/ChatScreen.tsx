import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useUser } from '../context/UserContext';

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { currentUser, getConversationsForUser, getUserById } = useUser();

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>Please sign up first</Text>
      </View>
    );
  }

  const conversations = getConversationsForUser(currentUser.id);

  const renderConversation = ({ item }: { item: any }) => {
    const otherUserId = item.participants.find((id: string) => id !== currentUser.id);
    const otherUser = getUserById(otherUserId);
    
    if (!otherUser) return null;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Conversation', { userId: otherUser.id, userName: otherUser.name })}
      >
        <View style={styles.conversationContent}>
          <View style={styles.avatar}>
            {otherUser.profilePicture ? (
              <Text style={styles.avatarText}>{otherUser.name[0]}</Text>
            ) : (
              <Ionicons name="person" size={24} color="#FFF5E1" />
            )}
          </View>
          <View style={styles.conversationInfo}>
            <Text style={styles.conversationName}>{otherUser.name}</Text>
            {item.lastMessage && (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage.text}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#A68B7B" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#E8D5C4" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start chatting with other users!</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E1',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#6F4E37',
  },
  listContent: {
    padding: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF5E1',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#A68B7B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6F4E37',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A68B7B',
    textAlign: 'center',
  },
  noUserText: {
    fontSize: 18,
    color: '#6F4E37',
    textAlign: 'center',
    marginTop: 100,
  },
});

