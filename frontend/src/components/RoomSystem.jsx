import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Users, Plus, LogIn, Copy, Check, UserCheck, Crown } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { mockRooms } from '../mock/mockData';

const RoomSystem = ({ onJoinRoom, currentRoom, connectedPlayers, isHost }) => {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    setIsCreating(true);
    const newRoomId = generateRoomId();
    
    setTimeout(() => {
      onJoinRoom(newRoomId, true);
      setIsCreating(false);
      toast({
        title: "Room Created!",
        description: `Room ${newRoomId} has been created. Share the room ID with your friend.`,
      });
    }, 1000);
  };

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      toast({
        title: "Invalid Room ID",
        description: "Please enter a valid room ID.",
        variant: "destructive",
      });
      return;
    }

    // Mock room validation
    const room = mockRooms.find(r => r.id.toLowerCase() === roomId.toLowerCase());
    if (!room) {
      toast({
        title: "Room Not Found",
        description: "The room ID you entered doesn't exist or is no longer active.",
        variant: "destructive",
      });
      return;
    }

    if (room.players.length >= 2) {
      toast({
        title: "Room Full",
        description: "This room already has 2 players. Please try another room.",
        variant: "destructive",
      });
      return;
    }

    onJoinRoom(roomId.toUpperCase(), false);
    toast({
      title: "Joined Room!",
      description: `Successfully joined room ${roomId.toUpperCase()}`,
    });
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(currentRoom);
    setCopied(true);
    toast({
      title: "Room ID Copied!",
      description: "Share this ID with your friend to let them join.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    onJoinRoom(null, false);
    toast({
      title: "Left Room",
      description: "You have left the multiplayer room.",
    });
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
                <div key={index} className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-green-500" />
                  <span>{player.name}</span>
                  {player.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
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
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? "Creating..." : "Create Room"}
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
              <Button onClick={handleJoinRoom} variant="outline">
                <LogIn className="w-4 h-4 mr-2" />
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
                {mockRooms.map((room) => (
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
                        Host: {room.host}
                      </div>
                    </div>
                    <Badge variant={room.players.length === 2 ? "secondary" : "default"}>
                      {room.players.length}/2
                    </Badge>
                  </div>
                ))}
                {mockRooms.length === 0 && (
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