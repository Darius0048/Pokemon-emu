import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Gamepad2, Users, Settings, Volume2, VolumeX } from 'lucide-react';

const GameEmulator = ({ romFile, isHost, roomId, connectedPlayers }) => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [gameState, setGameState] = useState('loading');
  const [linkCableStatus, setLinkCableStatus] = useState('disconnected');

  useEffect(() => {
    if (romFile && canvasRef.current) {
      // Mock emulator initialization
      setTimeout(() => {
        setGameState('ready');
        if (connectedPlayers.length > 1) {
          setLinkCableStatus('connected');
        }
      }, 2000);
    }
  }, [romFile, connectedPlayers]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    setGameState(isPlaying ? 'paused' : 'playing');
  };

  const handleReset = () => {
    setIsPlaying(false);
    setGameState('ready');
    setLinkCableStatus(connectedPlayers.length > 1 ? 'connected' : 'disconnected');
  };

  const handleSaveState = () => {
    // Mock save state functionality
    console.log('Save state created');
  };

  const handleLoadState = () => {
    // Mock load state functionality
    console.log('Save state loaded');
  };

  const renderGameScreen = () => {
    if (gameState === 'loading') {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
              {romFile ? `ROM: ${romFile.name}` : 'No ROM loaded'}
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
            <p className="text-2xl font-bold mb-2">Pokémon Fire Red</p>
            <p className="text-sm opacity-90">Game is running...</p>
            {linkCableStatus === 'connected' && (
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
            <Badge variant={linkCableStatus === 'connected' ? 'default' : 'secondary'}>
              <Users className="w-3 h-3 mr-1" />
              {linkCableStatus === 'connected' ? 'Link Cable On' : 'Single Player'}
            </Badge>
            {roomId && (
              <Badge variant="outline">
                Room: {roomId}
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
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={gameState === 'loading'}
          >
            Reset
          </Button>
          <Button
            onClick={handleSaveState}
            variant="outline"
            disabled={gameState === 'loading' || !isPlaying}
          >
            Save State
          </Button>
          <Button
            onClick={handleLoadState}
            variant="outline"
            disabled={gameState === 'loading'}
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
          {linkCableStatus === 'connected' && (
            <p className="text-green-600 font-medium">
              Link cable active! You can now trade and battle with other players.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameEmulator;