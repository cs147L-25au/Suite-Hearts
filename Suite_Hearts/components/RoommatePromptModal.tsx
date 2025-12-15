import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

interface RoommatePromptModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RoommatePromptModal({ visible, onClose }: RoommatePromptModalProps) {
  const { currentUser, convertUserAccountType } = useUser();

  const handleYes = async () => {
    if (currentUser) {
      await convertUserAccountType(currentUser.id, 'both');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={64} color="#FF6B35" />
          </View>
          <Text style={styles.title}>Do you also want to start looking for roommates?</Text>
          <Text style={styles.subtitle}>
            You can swipe and match with potential roommates in the Bay Area.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.noButton} onPress={onClose}>
              <Text style={styles.noButtonText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.yesButton} onPress={handleYes}>
              <Text style={styles.yesButtonText}>Yes, Show Me</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF5E1',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFE5D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6F4E37',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#A68B7B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  noButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8D5C4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F4E37',
  },
  yesButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  yesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF5E1',
  },
});

