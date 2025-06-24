import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Users, Plus, LogIn, Copy, Check, UserCheck, Crown, Loader2 } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const RoomSystem = () => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [copied, setCopied] = useState(false);

  const {
    currentRoom,
    connectedPlayers,
    isHost,
    isLoading,
    createRoom,
    joinRoom,
    leaveRoom,
    getAvailableRooms,
  } = useGame();

  // Load available rooms when dialog opens
  useEffect(() => {
    if (showRoomList) {
      loadAvailableRooms();
    }
  }, [showRoomList]);

  const loadAvailableRooms = async () => {
    try {
      const rooms = await getAvailableRooms();
      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      await createRoom(playerName.trim());
    } catch (error) {
      // Error handling is done in the context
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim() || !playerName.trim()) {
      return;
    }

    setIsJoining(true);
    try {
      await joinRoom(roomId.trim().toUpperCase(), playerName.trim());
    } catch (error) {
      // Error handling is done in the context
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(currentRoom);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  if (currentRoom) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Room: {currentRoom}
            {isHost && <Crown className="w-4 h-4 text-yellow-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Room ID:</span>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded text-sm">{currentRoom}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyRoomId}
                className="h-8 w-8 p-0"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Players ({connectedPlayers.length}/2):</span>
              <Badge variant={connectedPlayers.length === 2 ? "default" : "secondary"}>
                {connectedPlayers.length === 2 ? "Ready" : "Waiting"}
              </Badge>
            </div>
            <div className="space-y-1">
              {connectedPlayers.map((player, index) => (
                <div key={player.id || index} className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-green-500" />
                  <span>{player.name}</span>
                  {player.is_host && <Crown className="w-3 h-3 text-yellow-500" />}
                  <Badge variant="outline" className="ml-auto">
                    {player.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {connectedPlayers.length < 2 && (
            <div className="text-center text-sm text-muted-foreground">
              Waiting for another player to join...
            </div>
          )}

          <Button
            onClick={handleLeaveRoom}
            variant="outline"
            className="w-full"
          >
            Leave Room
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Multiplayer Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Player Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Name:</label>
          <Input
            placeholder="Enter your player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleCreateRoom}
            disabled={isCreating || isLoading || !playerName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </>
            )}
          </Button>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="flex-1"
                maxLength={6}
              />
              <Button 
                onClick={handleJoinRoom} 
                variant="outline"
                disabled={isJoining || isLoading || !roomId.trim() || !playerName.trim()}
              >
                {isJoining ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Join
              </Button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Dialog open={showRoomList} onOpenChange={setShowRoomList}>
            <DialogTrigger asChild>
              <Button variant="link" className="text-sm">
                Browse Available Rooms
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Available Rooms</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setRoomId(room.id);
                      setShowRoomList(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">{room.id}</div>
                      <div className="text-sm text-muted-foreground">
                        Host: {room.players[0]?.name || 'Unknown'}
                      </div>
                    </div>
                    <Badge variant={room.players.length === 2 ? "secondary" : "default"}>
                      {room.players.length}/2
                    </Badge>
                  </div>
                ))}
                {availableRooms.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No rooms available. Create one to get started!
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>Create a room to host a game, or join an existing room to play with friends.</p>
          <p className="mt-1">Link cable features work only in multiplayer rooms.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomSystem;