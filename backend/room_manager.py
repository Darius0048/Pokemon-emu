from typing import Dict, List, Optional
from datetime import datetime, timedelta
import asyncio
import logging
from models import Room, Player, PlayerStatus, LinkCableMessage, LinkCableAction

logger = logging.getLogger(__name__)

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.player_to_room: Dict[str, str] = {}  # player_id -> room_id
        self.socket_to_player: Dict[str, str] = {}  # socket_id -> player_id
        self._cleanup_task = None
        
    async def start_cleanup_task(self):
        """Start background task to clean up inactive rooms"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_inactive_rooms())
    
    async def stop_cleanup_task(self):
        """Stop the cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None

    async def _cleanup_inactive_rooms(self):
        """Clean up rooms that have been inactive for more than 1 hour"""
        while True:
            try:
                cutoff_time = datetime.utcnow() - timedelta(hours=1)
                rooms_to_remove = []
                
                for room_id, room in self.rooms.items():
                    if room.last_activity < cutoff_time or not room.is_active:
                        rooms_to_remove.append(room_id)
                
                for room_id in rooms_to_remove:
                    await self.remove_room(room_id)
                    logger.info(f"Cleaned up inactive room: {room_id}")
                
                await asyncio.sleep(300)  # Check every 5 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
                await asyncio.sleep(60)

    def create_room(self, host_name: str, rom_name: Optional[str] = None) -> tuple[Room, Player]:
        """Create a new room with the host player"""
        room = Room()
        host = Player(name=host_name, is_host=True, rom_name=rom_name)
        
        if rom_name:
            host.rom_loaded = True
            host.status = PlayerStatus.READY
        
        room.add_player(host)
        
        self.rooms[room.id] = room
        self.player_to_room[host.id] = room.id
        
        logger.info(f"Created room {room.id} with host {host_name}")
        return room, host

    def join_room(self, room_id: str, player_name: str, rom_name: Optional[str] = None) -> tuple[Optional[Room], Optional[Player], str]:
        """Join an existing room"""
        room = self.rooms.get(room_id.upper())
        if not room:
            return None, None, "Room not found"
        
        if not room.is_active:
            return None, None, "Room is no longer active"
        
        if len(room.players) >= room.max_players:
            return None, None, "Room is full"
        
        player = Player(name=player_name, rom_name=rom_name)
        
        if rom_name:
            player.rom_loaded = True
            player.status = PlayerStatus.READY
        
        if room.add_player(player):
            self.player_to_room[player.id] = room.id
            logger.info(f"Player {player_name} joined room {room_id}")
            return room, player, "Successfully joined room"
        
        return None, None, "Failed to join room"

    def leave_room(self, player_id: str) -> Optional[Room]:
        """Remove a player from their room"""
        room_id = self.player_to_room.get(player_id)
        if not room_id:
            return None
        
        room = self.rooms.get(room_id)
        if not room:
            return None
        
        player = room.get_player(player_id)
        if player:
            logger.info(f"Player {player.name} left room {room_id}")
        
        is_empty = room.remove_player(player_id)
        del self.player_to_room[player_id]
        
        # Remove socket mapping if exists
        socket_id = next((sid for sid, pid in self.socket_to_player.items() if pid == player_id), None)
        if socket_id:
            del self.socket_to_player[socket_id]
        
        if is_empty:
            del self.rooms[room_id]
            logger.info(f"Removed empty room {room_id}")
            return None
        
        return room

    def get_room(self, room_id: str) -> Optional[Room]:
        """Get a room by ID"""
        return self.rooms.get(room_id.upper())

    def get_player_room(self, player_id: str) -> Optional[Room]:
        """Get the room a player is in"""
        room_id = self.player_to_room.get(player_id)
        return self.rooms.get(room_id) if room_id else None

    def get_available_rooms(self, limit: int = 10) -> List[Room]:
        """Get list of available rooms that can be joined"""
        available = []
        for room in self.rooms.values():
            if room.is_active and len(room.players) < room.max_players:
                available.append(room)
        
        # Sort by creation time, newest first
        available.sort(key=lambda r: r.created_at, reverse=True)
        return available[:limit]

    def update_player_status(self, player_id: str, status: PlayerStatus) -> bool:
        """Update a player's status"""
        room = self.get_player_room(player_id)
        if not room:
            return False
        
        player = room.get_player(player_id)
        if not player:
            return False
        
        player.status = status
        room.last_activity = datetime.utcnow()
        return True

    def connect_socket(self, socket_id: str, player_id: str) -> bool:
        """Associate a socket ID with a player"""
        room = self.get_player_room(player_id)
        if not room:
            return False
        
        player = room.get_player(player_id)
        if not player:
            return False
        
        self.socket_to_player[socket_id] = player_id
        player.socket_id = socket_id
        player.status = PlayerStatus.CONNECTED
        room.last_activity = datetime.utcnow()
        
        logger.info(f"Connected socket {socket_id} to player {player.name}")
        return True

    def disconnect_socket(self, socket_id: str) -> Optional[tuple[Room, Player]]:
        """Disconnect a socket and update player status"""
        player_id = self.socket_to_player.get(socket_id)
        if not player_id:
            return None
        
        room = self.get_player_room(player_id)
        if not room:
            return None
        
        player = room.get_player(player_id)
        if not player:
            return None
        
        player.socket_id = None
        player.status = PlayerStatus.DISCONNECTED
        del self.socket_to_player[socket_id]
        
        logger.info(f"Disconnected socket {socket_id} from player {player.name}")
        return room, player

    def get_player_by_socket(self, socket_id: str) -> Optional[tuple[Room, Player]]:
        """Get room and player by socket ID"""
        player_id = self.socket_to_player.get(socket_id)
        if not player_id:
            return None
        
        room = self.get_player_room(player_id)
        if not room:
            return None
        
        player = room.get_player(player_id)
        if not player:
            return None
        
        return room, player

    async def remove_room(self, room_id: str):
        """Manually remove a room and clean up all associated data"""
        room = self.rooms.get(room_id)
        if not room:
            return
        
        # Clean up all players in the room
        for player in room.players[:]:  # Create a copy to avoid modification during iteration
            self.leave_room(player.id)
        
        # Remove the room
        if room_id in self.rooms:
            del self.rooms[room_id]

# Global room manager instance
room_manager = RoomManager()