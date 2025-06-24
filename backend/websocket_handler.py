import json
import logging
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from models import WebSocketMessage, LinkCableMessage, LinkCableAction, PlayerStatus
from room_manager import room_manager

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # socket_id -> websocket
        
    async def connect(self, websocket: WebSocket, socket_id: str):
        """Accept a WebSocket connection"""
        await websocket.accept()
        self.active_connections[socket_id] = websocket
        logger.info(f"WebSocket connected: {socket_id}")
    
    def disconnect(self, socket_id: str):
        """Remove a WebSocket connection"""
        if socket_id in self.active_connections:
            del self.active_connections[socket_id]
            logger.info(f"WebSocket disconnected: {socket_id}")
    
    async def send_message(self, socket_id: str, message: Dict[str, Any]):
        """Send a message to a specific socket"""
        websocket = self.active_connections.get(socket_id)
        if websocket:
            try:
                await websocket.send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"Error sending message to {socket_id}: {e}")
                self.disconnect(socket_id)
        return False
    
    async def broadcast_to_room(self, room_id: str, message: Dict[str, Any], exclude_socket: str = None):
        """Send a message to all players in a room"""
        room = room_manager.get_room(room_id)
        if not room:
            return
        
        sent_count = 0
        for player in room.players:
            if player.socket_id and player.socket_id != exclude_socket:
                if await self.send_message(player.socket_id, message):
                    sent_count += 1
        
        logger.info(f"Broadcasted message to {sent_count} players in room {room_id}")
    
    async def handle_message(self, socket_id: str, message_data: Dict[str, Any]):
        """Handle incoming WebSocket message"""
        try:
            message_type = message_data.get('type')
            data = message_data.get('data', {})
            
            logger.info(f"Received message from {socket_id}: {message_type}")
            
            if message_type == 'join_room':
                await self._handle_join_room(socket_id, data)
            elif message_type == 'leave_room':
                await self._handle_leave_room(socket_id)
            elif message_type == 'link_cable_data':
                await self._handle_link_cable_data(socket_id, data)
            elif message_type == 'player_status':
                await self._handle_player_status(socket_id, data)
            elif message_type == 'save_state':
                await self._handle_save_state(socket_id, data)
            elif message_type == 'ping':
                await self.send_message(socket_id, {'type': 'pong', 'data': {}})
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(f"Error handling message from {socket_id}: {e}")
            await self.send_message(socket_id, {
                'type': 'error',
                'data': {'message': 'Failed to process message'}
            })
    
    async def _handle_join_room(self, socket_id: str, data: Dict[str, Any]):
        """Handle player joining a room via WebSocket"""
        player_id = data.get('player_id')
        if not player_id:
            await self.send_message(socket_id, {
                'type': 'error',
                'data': {'message': 'Player ID required'}
            })
            return
        
        # Connect the socket to the player
        if room_manager.connect_socket(socket_id, player_id):
            room_data = room_manager.get_player_room(player_id)
            if room_data:
                # Notify other players in the room
                await self.broadcast_to_room(room_data.id, {
                    'type': 'player_joined',
                    'data': {
                        'room': room_data.dict(),
                        'message': 'A player has connected'
                    }
                }, exclude_socket=socket_id)
                
                # Send success response to the joining player
                await self.send_message(socket_id, {
                    'type': 'room_joined',
                    'data': {
                        'room': room_data.dict(),
                        'message': 'Successfully connected to room'
                    }
                })
        else:
            await self.send_message(socket_id, {
                'type': 'error',
                'data': {'message': 'Failed to join room'}
            })
    
    async def _handle_leave_room(self, socket_id: str):
        """Handle player leaving a room"""
        result = room_manager.disconnect_socket(socket_id)
        if result:
            room, player = result
            if room:  # Room still exists
                await self.broadcast_to_room(room.id, {
                    'type': 'player_left',
                    'data': {
                        'room': room.dict(),
                        'player_name': player.name,
                        'message': f'{player.name} has left the room'
                    }
                }, exclude_socket=socket_id)
    
    async def _handle_link_cable_data(self, socket_id: str, data: Dict[str, Any]):
        """Handle link cable data transmission between players"""
        result = room_manager.get_player_by_socket(socket_id)
        if not result:
            return
        
        room, sender = result
        
        if not room.link_cable_connected:
            await self.send_message(socket_id, {
                'type': 'error',
                'data': {'message': 'Link cable not connected'}
            })
            return
        
        # Find the other player in the room
        other_player = None
        for player in room.players:
            if player.id != sender.id and player.socket_id:
                other_player = player
                break
        
        if not other_player:
            await self.send_message(socket_id, {
                'type': 'error',
                'data': {'message': 'No other player connected'}
            })
            return
        
        # Forward the link cable data to the other player
        link_message = {
            'type': 'link_cable_data',
            'data': {
                'action': data.get('action'),
                'payload': data.get('payload', {}),
                'from_player': sender.name,
                'timestamp': data.get('timestamp')
            }
        }
        
        await self.send_message(other_player.socket_id, link_message)
        logger.info(f"Forwarded link cable data from {sender.name} to {other_player.name}")
    
    async def _handle_player_status(self, socket_id: str, data: Dict[str, Any]):
        """Handle player status updates"""
        result = room_manager.get_player_by_socket(socket_id)
        if not result:
            return
        
        room, player = result
        status = data.get('status')
        
        if status and hasattr(PlayerStatus, status.upper()):
            new_status = PlayerStatus(status.lower())
            if room_manager.update_player_status(player.id, new_status):
                # Broadcast status update to room
                await self.broadcast_to_room(room.id, {
                    'type': 'player_status_updated',
                    'data': {
                        'player_id': player.id,
                        'player_name': player.name,
                        'status': status,
                        'room': room.dict()
                    }
                })
    
    async def _handle_save_state(self, socket_id: str, data: Dict[str, Any]):
        """Handle save state operations"""
        result = room_manager.get_player_by_socket(socket_id)
        if not result:
            return
        
        room, player = result
        action = data.get('action')  # 'save' or 'load'
        
        if action == 'save':
            # Store save state data (in a real implementation, this would go to database)
            player.save_state = {
                'data': data.get('save_data'),
                'screenshot': data.get('screenshot'),
                'timestamp': data.get('timestamp')
            }
            
            await self.send_message(socket_id, {
                'type': 'save_state_response',
                'data': {
                    'action': 'save',
                    'success': True,
                    'message': 'Game state saved successfully'
                }
            })
        
        elif action == 'load':
            if player.save_state:
                await self.send_message(socket_id, {
                    'type': 'save_state_response',
                    'data': {
                        'action': 'load',
                        'success': True,
                        'save_data': player.save_state.get('data'),
                        'message': 'Game state loaded successfully'
                    }
                })
            else:
                await self.send_message(socket_id, {
                    'type': 'save_state_response',
                    'data': {
                        'action': 'load',
                        'success': False,
                        'message': 'No save state found'
                    }
                })

# Global WebSocket manager instance
websocket_manager = WebSocketManager()