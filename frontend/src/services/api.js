import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// API client configuration
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Room management API
export const roomAPI = {
  // Create a new room
  createRoom: async (playerName, romName = null) => {
    try {
      const response = await apiClient.post('/rooms', {
        player_name: playerName,
        rom_name: romName,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  // Join an existing room
  joinRoom: async (roomId, playerName, romName = null) => {
    try {
      const response = await apiClient.post('/rooms/join', {
        room_id: roomId,
        player_name: playerName,
        rom_name: romName,
      });
      return response.data;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  },

  // Get list of available rooms
  getAvailableRooms: async () => {
    try {
      const response = await apiClient.get('/rooms');
      return response.data;
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw error;
    }
  },

  // Get specific room details
  getRoom: async (roomId) => {
    try {
      const response = await apiClient.get(`/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting room:', error);
      throw error;
    }
  },

  // Delete a room
  deleteRoom: async (roomId) => {
    try {
      const response = await apiClient.delete(`/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting room:', error);  
      throw error;
    }
  },
};

// General API endpoints
export const generalAPI = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  },
};

export default apiClient;