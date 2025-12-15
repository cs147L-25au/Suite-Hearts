import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

interface HousingPromptScreenProps {
  children: React.ReactNode;
  screenName: 'Search' | 'Map';
}

export default function HousingPromptScreen({ children, screenName }: HousingPromptScreenProps) {
  const { currentUser, convertUserAccountType } = useUser();
  const [showPrompt, setShowPrompt] = React.useState(false);

  const isRoommateOnly = currentUser?.userType === 'searcher' && currentUser?.lookingFor === 'roommates';

  React.useEffect(() => {
    if (isRoommateOnly) {
      setShowPrompt(true);
    }
  }, [isRoommateOnly]);

  const handleYes = async () => {
    if (currentUser) {
      await convertUserAccountType(currentUser.id, 'both');
      setShowPrompt(false);
    }
  };

  const handleNo = () => {
    setShowPrompt(false);
  };

  if (!isRoommateOnly) {
    return <>{children}</>;
  }

  return (
    <>
      {showPrompt && (
        <Modal
          visible={showPrompt}
          transparent={true}
          animationType="fade"
          onRequestClose={handleNo}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="home" size={64} color="#FF6B35" />
              </View>
              <Text style={styles.title}>Do you also want to look for housing?</Text>
              <Text style={styles.subtitle}>
                You can browse and search for available listings in the Bay Area.
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.noButton} onPress={handleNo}>
                  <Text style={styles.noButtonText}>Not Now</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.yesButton} onPress={handleYes}>
                  <Text style={styles.yesButtonText}>Yes, Show Me</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {!showPrompt && <>{children}</>}
    </>
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

