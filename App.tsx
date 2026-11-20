import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MusicPlayerProvider } from './src/context/MusicPlayerContext';
import { ChassisContainer } from './src/components/ChassisContainer';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <MusicPlayerProvider>
        <ChassisContainer />
      </MusicPlayerProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0b0d',
  },
});
