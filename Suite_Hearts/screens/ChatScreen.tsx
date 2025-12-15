import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Image, TextInput, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Conversation } from '../types';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

const Tab = createMaterialTopTabNavigator();

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { currentUser, getConversationsForUser, getUserById, deleteConversation, createGroupConversation, users, conversations } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Set<string>>(new Set());
  const [matchedUserIds, setMatchedUserIds] = useState<Set<string>>(new Set());

  // Fetch matches from Supabase
  useEffect(() => {
    const fetchMatches = async () => {
      if (!currentUser) return;
      
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('user1_id, user2_id')
          .eq('is_active', true)
          .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

        if (error) {
          console.error('Error fetching matches:', error);
          return;
        }

        const matchedIds = new Set<string>();
        (data || []).forEach((match) => {
          if (match.user1_id === currentUser.id) {
            matchedIds.add(match.user2_id);
          } else {
            matchedIds.add(match.user1_id);
          }
        });
        setMatchedUserIds(matchedIds);
      } catch (error) {
        console.error('Error fetching matches:', error);
      }
    };

    fetchMatches();
  }, [currentUser]);

  // All hooks must be called before any conditional returns
  // Use conversations directly to ensure re-render when conversations change
  const allConversations = currentUser ? getConversationsForUser(currentUser.id) : [];
  
  // Filter conversations for matches tab (only conversations with matched users)
  const matchedConversations = useMemo(() => {
    if (!currentUser || matchedUserIds.size === 0) return [];
    
    return allConversations.filter(conv => {
      // Only show 1-on-1 conversations (not groups)
      if (conv.isGroup) return false;
      
      // Check if the other participant is a matched user
      const otherUserId = conv.participants.find(id => id !== currentUser.id);
      return otherUserId ? matchedUserIds.has(otherUserId) : false;
    });
  }, [allConversations, currentUser, matchedUserIds]);
  
  // Get all matched/contacted users for group creation
  const availableContacts = useMemo(() => {
    const contactIds = new Set<string>();
    allConversations.forEach(conv => {
      conv.participants.forEach(id => {
        if (id !== currentUser.id) contactIds.add(id);
      });
    });
    return Array.from(contactIds).map(id => getUserById(id)).filter(Boolean);
  }, [allConversations, currentUser.id, getUserById]);

  // Filter conversations based on search (for Messages tab)
  const filteredAllConversations = useMemo(() => {
    if (!searchQuery.trim()) return allConversations;
    
    const query = searchQuery.toLowerCase();
    return allConversations.filter(conv => {
      // Search in participant names
      const participantNames = conv.participants
        .filter(id => id !== currentUser?.id)
        .map(id => getUserById(id)?.name || '')
        .join(' ')
        .toLowerCase();
      
      if (participantNames.includes(query)) return true;
      
      // Search in message texts
      if (conv.messages && conv.messages.length > 0) {
        const messageTexts = conv.messages
          .map(msg => msg.text || '')
          .join(' ')
          .toLowerCase();
        if (messageTexts.includes(query)) return true;
      }
      
      // Search in last message
      if (conv.lastMessage?.text?.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [allConversations, searchQuery, currentUser, getUserById]);

  // Filter matched conversations based on search (for Matches tab)
  const filteredMatchedConversations = useMemo(() => {
    if (!searchQuery.trim()) return matchedConversations;
    
    const query = searchQuery.toLowerCase();
    return matchedConversations.filter(conv => {
      // Search in participant names
      const participantNames = conv.participants
        .filter(id => id !== currentUser?.id)
        .map(id => getUserById(id)?.name || '')
        .join(' ')
        .toLowerCase();
      
      if (participantNames.includes(query)) return true;
      
      // Search in message texts
      if (conv.messages && conv.messages.length > 0) {
        const messageTexts = conv.messages
          .map(msg => msg.text || '')
          .join(' ')
          .toLowerCase();
        if (messageTexts.includes(query)) return true;
      }
      
      // Search in last message
      if (conv.lastMessage?.text?.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [matchedConversations, searchQuery, currentUser, getUserById]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = today.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  };

  const handleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedConversations(new Set());
  };

  const toggleConversationSelection = (conversationId: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedConversations.size === 0) return;
    
    Alert.alert(
      'Delete Conversations',
      `Are you sure you want to delete ${selectedConversations.size} conversation(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const convId of selectedConversations) {
              await deleteConversation(convId);
            }
            setIsDeleteMode(false);
            setSelectedConversations(new Set());
          },
        },
      ]
    );
  };

  const handleCreateGroup = async () => {
    if (selectedGroupMembers.size < 2) {
      Alert.alert('Error', 'Please select at least 2 people for a group chat (max 6 total).');
      return;
    }
    if (selectedGroupMembers.size > 5) {
      Alert.alert('Error', 'Group chats can have a maximum of 6 people total.');
      return;
    }
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name.');
      return;
    }

    if (!currentUser) return;
    const participantIds = [currentUser.id, ...Array.from(selectedGroupMembers)];
    await createGroupConversation(participantIds, groupName.trim());
    setShowGroupModal(false);
    setGroupName('');
    setSelectedGroupMembers(new Set());
  };


  const renderConversation = ({ item }: { item: typeof allConversations[0] }) => {
    if (!currentUser) return null;
    const otherUserIds = item.participants.filter((id: string) => id !== currentUser.id);
    const otherUsers = otherUserIds.map((id: string) => getUserById(id)).filter(Boolean);
    const isGroup = item.isGroup || otherUsers.length > 1;
    const displayName = isGroup ? (item.groupName || `${otherUsers.length + 1} people`) : (otherUsers[0]?.name || 'Unknown');
    const isSelected = selectedConversations.has(item.id);

    const hasMessages = item.lastMessage;
    const lastMessageText = hasMessages 
      ? (item.lastMessage.imageUrl ? '📷 Photo' : item.lastMessage.text)
      : null;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, isSelected && styles.conversationItemSelected]}
        onPress={() => {
          if (isDeleteMode) {
            toggleConversationSelection(item.id);
          } else {
            if (isGroup) {
              // Navigate to group conversation
              navigation.navigate('Conversation', { userId: item.id, userName: displayName });
            } else {
              navigation.navigate('Conversation', { userId: otherUsers[0]?.id || '', userName: displayName });
            }
          }
        }}
        onLongPress={() => {
          if (!isDeleteMode) {
            setIsDeleteMode(true);
            toggleConversationSelection(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        {isDeleteMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </View>
        )}
        <View style={styles.conversationContent}>
          {/* Profile Photo(s) */}
          <View style={styles.avatarContainer}>
            {isGroup ? (
              <View style={styles.groupAvatar}>
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </View>
            ) : otherUsers[0]?.profilePicture ? (
              <Image 
                source={{ uri: otherUsers[0].profilePicture }} 
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
          </View>

          {/* Conversation Info */}
          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationName} numberOfLines={1}>
                {displayName}
              </Text>
              {hasMessages && (
                <Text style={styles.timestamp}>
                  {formatTimestamp(item.lastMessage.timestamp)}
                </Text>
              )}
            </View>
            {hasMessages ? (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {lastMessageText}
              </Text>
            ) : (
              <Text style={styles.startTalkingPrompt}>
                Start talking
              </Text>
            )}
          </View>
        </View>
        {!isDeleteMode && <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />}
      </TouchableOpacity>
    );
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.noUserText}>Please sign up first</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          {isDeleteMode ? (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleDeleteMode}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={handleDeleteSelected}
                disabled={selectedConversations.size === 0}
              >
                <Ionicons 
                  name="trash" 
                  size={24} 
                  color={selectedConversations.size > 0 ? '#FF3B30' : '#C7C7CC'} 
                />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleDeleteMode}>
                <Ionicons name="trash-outline" size={24} color="#6F4E37" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={() => setShowGroupModal(true)}>
                <Ionicons name="create-outline" size={24} color="#6F4E37" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#A68B7B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations, names, messages..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#A68B7B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigator */}
      <Tab.Navigator
        tabBar={(props) => (
          <View style={styles.customTabBar}>
            {props.state.routes.map((route, index) => {
              const { options } = props.descriptors[route.key];
              const label = options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

              const isFocused = props.state.index === index;

              const onPress = () => {
                const event = props.navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  props.navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  style={[
                    styles.customTabButton,
                    isFocused && styles.customTabButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.customTabLabel,
                      isFocused && styles.customTabLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      >
        <Tab.Screen name="Messages" options={{ tabBarLabel: 'Messages' }}>
          {() => (
            <View style={{ flex: 1 }}>
              {filteredAllConversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#E8D5C4" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search term' : 'Start chatting with other users!'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredAllConversations}
                  renderItem={renderConversation}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              )}
            </View>
          )}
        </Tab.Screen>
        <Tab.Screen name="Matches" options={{ tabBarLabel: 'Matches' }}>
          {() => (
            <View style={{ flex: 1 }}>
              {filteredMatchedConversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="heart-outline" size={64} color="#E8D5C4" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No matches found' : 'No matches yet'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search term' : 'Swipe right on roommates to match and start chatting!'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredMatchedConversations}
                  renderItem={renderConversation}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              )}
            </View>
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Group Chat Modal */}
      <Modal visible={showGroupModal} transparent animationType="slide" onRequestClose={() => setShowGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Group Chat</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color="#6F4E37" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Group Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter group name"
                value={groupName}
                onChangeText={setGroupName}
              />
              
              <Text style={styles.modalLabel}>Select Members ({selectedGroupMembers.size}/4)</Text>
              <FlatList
                data={availableContacts}
                keyExtractor={(user) => user.id}
                renderItem={({ item: user }) => {
                  const isSelected = selectedGroupMembers.has(user.id);
                  return (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() => {
                        const newSelected = new Set(selectedGroupMembers);
                        if (isSelected) {
                          newSelected.delete(user.id);
                        } else {
                          if (newSelected.size < 4) {
                            newSelected.add(user.id);
                          } else {
                            Alert.alert('Limit', 'Group chats can have a maximum of 6 people total (including you).');
                          }
                        }
                        setSelectedGroupMembers(newSelected);
                      }}
                    >
                      <View style={styles.contactAvatar}>
                        {user.profilePicture ? (
                          <Image source={{ uri: user.profilePicture }} style={styles.contactAvatarImage} />
                        ) : (
                          <Text style={styles.contactAvatarText}>{user.name[0]?.toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={styles.contactName}>{user.name}</Text>
                      <View style={[styles.contactCheckbox, isSelected && styles.contactCheckboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowGroupModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalCreateButton, (selectedGroupMembers.size < 2 || !groupName.trim()) && styles.modalCreateButtonDisabled]} 
                onPress={handleCreateGroup}
                disabled={selectedGroupMembers.size < 2 || !groupName.trim()}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF5E1',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    padding: 0,
  },
  listContent: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  conversationItemSelected: {
    backgroundColor: '#FFF5E1',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6F4E37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  timestamp: {
    fontSize: 15,
    color: '#8E8E93',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 2,
  },
  startTalkingPrompt: {
    fontSize: 15,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 2,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#C6C6C8',
    marginLeft: 84,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF5E1',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
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
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#6F4E37',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6F4E37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactName: {
    flex: 1,
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
  },
  contactCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCheckboxSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8D5C4',
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F4E37',
  },
  modalCreateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  modalCreateButtonDisabled: {
    opacity: 0.5,
  },
  modalCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  customTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF5E1',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C4',
  },
  customTabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  customTabButtonActive: {
    backgroundColor: '#FF6B35',
  },
  customTabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A68B7B',
  },
  customTabLabelActive: {
    color: '#FFFFFF',
  },
});
