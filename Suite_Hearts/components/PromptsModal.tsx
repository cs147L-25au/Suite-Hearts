import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserPrompt } from '../types';
import { Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const PROMPT_OPTIONS = [
  { id: '1', text: 'One thing you should know about living with me is' },
  { id: '2', text: '3 weird habits I have around the house' },
  { id: '3', text: 'My living non-negotiables are' },
  { id: '4', text: 'I am allergic to' },
  { id: '5', text: 'Please don\'t live with me if' },
  { id: '6', text: 'My nightmare roommate is someone' },
  { id: '7', text: 'My ideal roommate is someone' },
  { id: '8', text: 'My worst roommate story' },
  { id: '9', text: 'I want to live in a home that' },
  { id: '10', text: 'I want to live with people who' },
];

interface PromptsModalProps {
  visible: boolean;
  prompts: UserPrompt[];
  onClose: () => void;
  onSave: (prompts: UserPrompt[]) => void;
}

export default function PromptsModal({ visible, prompts, onClose, onSave }: PromptsModalProps) {
  const [userPrompts, setUserPrompts] = useState<UserPrompt[]>([]);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setUserPrompts(prompts || []);
    }
  }, [visible, prompts]);

  const handleSelectPrompt = (promptId: string) => {
    // Check if already selected
    const existing = userPrompts.find(p => p.id === promptId);
    if (existing) {
      // Edit existing
      setEditingPromptId(promptId);
      setEditingAnswer(existing.answer);
    } else {
      // Check if user already has 3 prompts
      if (userPrompts.length >= 3) {
        Alert.alert('Limit Reached', 'You can only have up to 3 prompts. Remove one to add another.');
        return;
      }
      // Add new prompt
      const prompt = PROMPT_OPTIONS.find(p => p.id === promptId);
      if (prompt) {
        setEditingPromptId(promptId);
        setEditingAnswer('');
      }
    }
  };

  const handleSaveAnswer = () => {
    if (!editingPromptId) return;
    
    if (!editingAnswer.trim()) {
      Alert.alert('Required', 'Please enter an answer for this prompt.');
      return;
    }

    const prompt = PROMPT_OPTIONS.find(p => p.id === editingPromptId);
    if (!prompt) return;

    const updatedPrompts = userPrompts.filter(p => p.id !== editingPromptId);
    updatedPrompts.push({
      id: editingPromptId,
      promptText: prompt.text,
      answer: editingAnswer.trim(),
    });

    setUserPrompts(updatedPrompts);
    setEditingPromptId(null);
    setEditingAnswer('');
  };

  const handleRemovePrompt = (promptId: string) => {
    const updatedPrompts = userPrompts.filter(p => p.id !== promptId);
    setUserPrompts(updatedPrompts);
  };

  const handleSaveAll = () => {
    onSave(userPrompts);
    onClose();
  };

  const selectedPromptIds = userPrompts.map(p => p.id);
  const availablePrompts = PROMPT_OPTIONS.filter(p => !selectedPromptIds.includes(p.id) || editingPromptId === p.id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Prompts</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6F4E37" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {editingPromptId ? (
              // Edit mode
              <View>
                <Text style={styles.promptQuestion}>
                  {PROMPT_OPTIONS.find(p => p.id === editingPromptId)?.text}
                </Text>
                <TextInput
                  style={styles.answerInput}
                  placeholder="Your answer..."
                  placeholderTextColor="#A68B7B"
                  value={editingAnswer}
                  onChangeText={setEditingAnswer}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    onPress={() => {
                      setEditingPromptId(null);
                      setEditingAnswer('');
                    }}
                  >
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveAnswer}>
                    <Text style={styles.saveEditText}>Save Answer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Selection mode
              <>
                <Text style={styles.sectionTitle}>Your Prompts ({userPrompts.length}/3)</Text>
                
                {/* Display selected prompts */}
                {userPrompts.map((prompt) => {
                  const promptOption = PROMPT_OPTIONS.find(p => p.id === prompt.id);
                  return (
                    <View key={prompt.id} style={styles.selectedPromptCard}>
                      <View style={styles.selectedPromptHeader}>
                        <Text style={styles.selectedPromptQuestion}>{promptOption?.text}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemovePrompt(prompt.id)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="close-circle" size={24} color="#DC3545" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.selectedPromptAnswer}>{prompt.answer}</Text>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleSelectPrompt(prompt.id)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Available prompts to select */}
                {userPrompts.length < 3 && (
                  <>
                    <Text style={styles.sectionTitle}>Add a Prompt</Text>
                    {availablePrompts.map((prompt) => (
                      <TouchableOpacity
                        key={prompt.id}
                        style={styles.promptOption}
                        onPress={() => handleSelectPrompt(prompt.id)}
                      >
                        <Text style={styles.promptOptionText}>{prompt.text}</Text>
                        <Ionicons name="add-circle-outline" size={24} color="#FF6B35" />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            )}
          </ScrollView>

          {!editingPromptId && (
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveAll}>
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
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6F4E37',
    marginBottom: 16,
    marginTop: 8,
  },
  promptQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6F4E37',
    marginBottom: 12,
  },
  answerInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#6F4E37',
    borderWidth: 1,
    borderColor: '#E8D5C4',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelEditButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  cancelEditText: {
    color: '#6F4E37',
    fontSize: 16,
    fontWeight: '600',
  },
  saveEditButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveEditText: {
    color: '#FFF5E1',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedPromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  selectedPromptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  selectedPromptQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F4E37',
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  selectedPromptAnswer: {
    fontSize: 14,
    color: '#6F4E37',
    marginBottom: 12,
    lineHeight: 20,
  },
  editButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFE5D9',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  promptOption: {
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
  promptOptionText: {
    fontSize: 16,
    color: '#6F4E37',
    fontWeight: '500',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8D5C4',
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

