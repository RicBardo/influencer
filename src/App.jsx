import React, { useState } from 'react';
import SetupScreen from './SetupScreen';
import GameBoard from './GameBoard';
import './App.css';

export default function App() {
  const [setup, setSetup] = useState(null);

  if (!setup) {
    return <SetupScreen onStart={setSetup} />;
  }
  return <GameBoard setup={setup} />;
}
