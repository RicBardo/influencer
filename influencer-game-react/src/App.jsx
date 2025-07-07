import { useState } from 'react';
import SetupScreen from './SetupScreen';
import GameBoard from './GameBoard';

function App() {
  const [setup, setSetup] = useState(null);

  if (!setup) {
    return <SetupScreen onStart={setSetup} />;
  }
  return <GameBoard setup={setup} />;
}

export default App;
