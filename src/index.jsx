import React from 'react';
import { createRoot } from 'react-dom/client';
import SetupScreen from './SetupScreen';

const onStartGame = (setupData) => {
  console.log('Game setup:', setupData);
  // Here you would hide the React setup and show the vanilla game UI
};

const root = createRoot(document.getElementById('setup-root'));
root.render(<SetupScreen onStartGame={onStartGame} />); 