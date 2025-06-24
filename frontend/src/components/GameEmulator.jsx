import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Gamepad2, Users, Settings, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const GameEmulator = () => {
  const canvasRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const {
    romFile,
    currentRoom,
    connectedPlayers,
    isHost,
    linkCableConnected,
    gameState,
    setGameState,
    sendLinkCableData,
    saveGameState,
    loadGameState,
  } = useGame();

  useEffect(() => {
    if (romFile && canvasRef.current) {
      // Initialize emulator when ROM is loaded
      initializeEmulator();
    }
  }, [romFile]);

  const initializeEmulator = () => {
    // This would initialize the actual GBA emulator
    // For now, we'll set up mock emulator behavior
    setGameState('ready');
    
    // Set up global emulator object for link cable communication
    window.emulator = {
      receiveLinkCableData: (action, payload) => {
        console.log('Emulator received link cable data:', action, payload);
        // Handle incoming link cable data
      },
      
      sendLinkCableData: (action, payload) => {
        console.log('Emulator sending link cable data:', action, payload);
        sendLinkCableData(action, payload);
      },
      
      loadSaveData: (saveData) => {
        console.log('Loading save data:', saveData);
        // Load save data into emulator
      },
      
      getSaveData: () => {
        console.log('Getting save data from emulator');
        // Return current save data
        return 'mock_save_data';
      },
    };
  };

  const handlePlay = () => {
    const newState = gameState === 'playing' ? 'paused' : 'playing';
    setGameState(newState);
  };

  const handleReset = () => {
    setGameState('ready');
  };

  const handleSaveState = () => {
    if (window.emulator?.getSaveData) {
      const saveData = window.emulator.getSaveData();
      saveGameState(saveData);
    }
  };

  const handleLoadState = () => {
    loadGameState();
  };

  const renderGameScreen = () => {
    if (!romFile) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
          <div className="text-center">
            <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No ROM Loaded</p>
            <p className="text-sm opacity-75">Upload a ROM file to start playing</p>
          </div>
        </div>
      );
    }

    if (gameState === 'loading') {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p>Loading ROM...</p>
          </div>
        </div>
      );
    }

    if (gameState === 'ready' || gameState === 'paused') {
      return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-900 to-blue-900 text-white">
          <div className="text-center">
            <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">
              {gameState === 'ready' ? 'Ready to Play!' : 'Game Paused'}
            </p>
            <p className="text-sm opacity-75">
              ROM: {romFile.name}
            </p>
          </div>
        </div>
      );
    }

    // Mock gameplay screen
    return (
      <div className="relative h-full bg-gradient-to-br from-green-800 via-green-600 to-green-400">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-yellow-400 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <div className="w-16 h-16 bg-yellow-600 rounded-full"></div>
            </div>
            <p className="text-2xl font-bold mb-2">
              {romFile.name.includes('Fire') ? 'Pokémon Fire Red' : 'Pokémon Leaf Green'}
            </p>
            <p className="text-sm opacity-90">Game is running...</p>
            {linkCableConnected && (
              <Badge className="mt-2 bg-green-500 hover:bg-green-600">
                <Users className="w-3 h-3 mr-1" />
                Link Cable Connected
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            Game Boy Advance Emulator
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={linkCableConnected ? 'default' : 'secondary'}>
              <Users className="w-3 h-3 mr-1" />
              {linkCableConnected ? 'Link Cable On' : 'Single Player'}
            </Badge>
            {currentRoom && (
              <Badge variant="outline">
                Room: {currentRoom}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Game Screen */}
        <div className="relative mb-4">
          <canvas
            ref={canvasRef}
            width={240}
            height={160}
            className="w-full max-w-2xl mx-auto bg-black border-4 border-gray-800 rounded-lg shadow-2xl"
            style={{ aspectRatio: '3/2', imageRendering: 'pixelated' }}
          />
          <div className="absolute inset-0 rounded-lg overflow-hidden">
            {renderGameScreen()}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <Button
            onClick={handlePlay}
            disabled={!romFile || gameState === 'loading'}
            className="bg-green-600 hover:bg-green-700"
          >
            {gameState === 'playing' ? 'Pause' : 'Play'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={gameState === 'loading' || !romFile}
          >
            Reset
          </Button>
          <Button
            onClick={handleSaveState}
            variant="outline"
            disabled={gameState === 'loading' || gameState !== 'playing'}
          >
            Save State
          </Button>
          <Button
            onClick={handleLoadState}
            variant="outline"
            disabled={gameState === 'loading' || !romFile}
          >
            Load State
          </Button>
          <Button
            onClick={() => setIsMuted(!isMuted)}
            variant="outline"
            size="icon"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Game Controls Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p className="mb-1">
            <strong>Controls:</strong> Arrow Keys (D-Pad) • Z (A) • X (B) • A (L) • S (R) • Enter (Start) • Shift (Select)
          </p>
          {linkCableConnected && (
            <p className="text-green-600 font-medium">
              Link cable active! You can now trade and battle with other players.
            </p>
          )}
          {connectedPlayers.length > 0 && (
            <p className="text-blue-600 font-medium mt-1">
              Connected players: {connectedPlayers.map(p => p.name).join(', ')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameEmulator;