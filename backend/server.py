from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
import json

# Import our new modules
from .models import (
    CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, JoinRoomResponse,
    RoomListResponse, WebSocketMessage, Room, Player, PlayerStatus
)
from .room_manager import room_manager
from .websocket_handler import websocket_manager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Pokemon Multiplayer Emulator API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Startup event to initialize room manager
@app.on_event("startup")
async def startup_event():
    await room_manager.start_cleanup_task()
    logger.info("Room manager cleanup task started")

@app.on_event("shutdown")
async def shutdown_event():
    await room_manager.stop_cleanup_task()
    client.close()
    logger.info("Application shutdown completed")

# Define Models for backward compatibility
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Original routes
@api_router.get("/")
async def root():
    return {"message": "Pokemon Multiplayer Emulator API", "version": "1.0.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# New multiplayer routes
@api_router.post("/rooms", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest):
    """Create a new multiplayer room"""
    try:
        room, host = room_manager.create_room(request.player_name, request.rom_name)
        
        # Store room in database
        room_doc = room.dict()
        await db.rooms.insert_one(room_doc)
        
        return CreateRoomResponse(
            success=True,
            room_id=room.id,
            player_id=host.id,
            message=f"Room {room.id} created successfully"
        )
    except Exception as e:
        logger.error(f"Error creating room: {e}")
        raise HTTPException(status_code=500, detail="Failed to create room")

@api_router.post("/rooms/join", response_model=JoinRoomResponse)
async def join_room(request: JoinRoomRequest):
    """Join an existing room"""
    try:
        room, player, message = room_manager.join_room(
            request.room_id, 
            request.player_name, 
            request.rom_name
        )
        
        if room and player:
            # Update room in database
            room_doc = room.dict()
            await db.rooms.update_one(
                {"id": room.id},
                {"$set": room_doc}
            )
            
            return JoinRoomResponse(
                success=True,
                room=room,
                player_id=player.id,
                message=message
            )
        else:
            return JoinRoomResponse(
                success=False,
                room=None,
                player_id=None,
                message=message
            )
    except Exception as e:
        logger.error(f"Error joining room: {e}")
        raise HTTPException(status_code=500, detail="Failed to join room")

@api_router.get("/rooms", response_model=RoomListResponse)
async def get_available_rooms():
    """Get list of available rooms"""
    try:
        rooms = room_manager.get_available_rooms()
        return RoomListResponse(
            rooms=rooms,
            total=len(rooms)
        )
    except Exception as e:
        logger.error(f"Error getting rooms: {e}")
        raise HTTPException(status_code=500, detail="Failed to get rooms")

@api_router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    """Get specific room details"""
    room = room_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {"success": True, "room": room.dict()}

@api_router.delete("/rooms/{room_id}")
async def delete_room(room_id: str):
    """Delete a room (only by host)"""
    try:
        await room_manager.remove_room(room_id)
        
        # Remove from database
        await db.rooms.delete_one({"id": room_id})
        
        return {"success": True, "message": "Room deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting room: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete room")

# WebSocket endpoint
@app.websocket("/ws/{socket_id}")
async def websocket_endpoint(websocket: WebSocket, socket_id: str):
    """WebSocket endpoint for real-time multiplayer communication"""
    await websocket_manager.connect(websocket, socket_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle the message
            await websocket_manager.handle_message(socket_id, message_data)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {socket_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {socket_id}: {e}")
    finally:
        # Clean up on disconnect
        websocket_manager.disconnect(socket_id)
        result = room_manager.disconnect_socket(socket_id)
        if result:
            room, player = result
            if room:
                # Notify other players in the room
                await websocket_manager.broadcast_to_room(room.id, {
                    'type': 'player_disconnected',
                    'data': {
                        'player_name': player.name,
                        'room': room.dict(),
                        'message': f'{player.name} has disconnected'
                    }
                }, exclude_socket=socket_id)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
