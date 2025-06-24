from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from enum import Enum

class PlayerStatus(str, Enum):
    CONNECTING = "connecting"
    CONNECTED = "connected"
    READY = "ready"
    PLAYING = "playing"
    DISCONNECTED = "disconnected"

class LinkCableAction(str, Enum):
    TRADE_REQUEST = "trade_request"
    BATTLE_REQUEST = "battle_request"
    TRADE_POKEMON = "trade_pokemon"
    BATTLE_START = "battle_start"
    BATTLE_ACTION = "battle_action"
    TRADE_COMPLETE = "trade_complete"
    BATTLE_COMPLETE = "battle_complete"
    SYNC_DATA = "sync_data"

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    is_host: bool = False
    status: PlayerStatus = PlayerStatus.CONNECTING
    socket_id: Optional[str] = None
    rom_loaded: bool = False
    rom_name: Optional[str] = None
    save_state: Optional[Dict[str, Any]] = None
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class Room(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()).upper()[:6])
    host_id: str
    players: List[Player] = []
    max_players: int = 2
    is_active: bool = True
    link_cable_connected: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)

    def add_player(self, player: Player) -> bool:
        if len(self.players) >= self.max_players:
            return False
        
        if not self.players:  # First player becomes host
            player.is_host = True
            self.host_id = player.id
        
        self.players.append(player)
        self.last_activity = datetime.utcnow()
        
        # Auto-connect link cable when we have 2 players
        if len(self.players) == 2:
            self.link_cable_connected = True
            
        return True
    
    def remove_player(self, player_id: str) -> bool:
        self.players = [p for p in self.players if p.id != player_id]
        self.last_activity = datetime.utcnow()
        
        # Disconnect link cable if less than 2 players
        if len(self.players) < 2:
            self.link_cable_connected = False
            
        # If host leaves, make next player host
        if self.players and self.host_id == player_id:
            self.players[0].is_host = True
            self.host_id = self.players[0].id
            
        return len(self.players) == 0  # Return True if room is empty

    def get_player(self, player_id: str) -> Optional[Player]:
        return next((p for p in self.players if p.id == player_id), None)

class LinkCableMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    from_player_id: str
    to_player_id: Optional[str] = None  # None means broadcast to all
    action: LinkCableAction
    data: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SaveState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    room_id: str
    game_data: str  # Base64 encoded save data
    screenshot: Optional[str] = None  # Base64 encoded screenshot
    name: str = "Quick Save"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# API Request/Response Models
class CreateRoomRequest(BaseModel):
    player_name: str
    rom_name: Optional[str] = None

class CreateRoomResponse(BaseModel):
    success: bool
    room_id: str
    player_id: str
    message: str

class JoinRoomRequest(BaseModel):
    room_id: str
    player_name: str
    rom_name: Optional[str] = None

class JoinRoomResponse(BaseModel):
    success: bool
    room: Optional[Room] = None
    player_id: Optional[str] = None
    message: str

class RoomListResponse(BaseModel):
    rooms: List[Room]
    total: int

class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)