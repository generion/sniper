import React from 'react';
import { Game } from './components/Game';

function App() {
  return (
    // Height 100dvh fix for mobile browsers to account for address bars
    <div className="h-[100dvh] w-screen flex flex-col bg-black overflow-hidden font-sans">
       <Game />
    </div>
  );
}

export default App;