import React, { useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@types';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'SignUp'>;
}

export default function SignUpScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState('');
  const [lookingFor, setLookingFor] = useState('');

  const renderStep = () => {
    if (step === 0) {
      return (
        <View>
          <Text>Are you listing a home or looking for a place to stay?</Text>
          <Button title="Listing a Home" onPress={() => { setUserType('homeowner'); setStep(1); }} />
          <Button title="Looking for a Place" onPress={() => { setUserType('searcher'); setStep(1); }} />
        </View>
      );
    }

    if (step === 1 && userType === 'searcher') {
      return (
        <View>
          <Text>Are you looking for roommates or just housing?</Text>
          <Button title="Roommates" onPress={() => { setLookingFor('roommates'); setStep(2); }} />
          <Button title="Housing" onPress={() => { setLookingFor('housing'); setStep(2); }} />
        </View>
      );
    }

    if (step === 1 || step === 2) {
      return (
        <View>
          <Text>Questionnaire Placeholder</Text>
          <Button title="Complete Sign-Up" onPress={() => navigation.navigate('Home')} />
        </View>
      );
    }

    return null;
  };

  return <View style={styles.container}>{renderStep()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});