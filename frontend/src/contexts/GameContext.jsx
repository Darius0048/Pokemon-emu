import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { roomAPI } from '../services/api';
import websocketService from '../services/websocket';
import { useToast } from '../hooks/use-toast';

// Action types
const ACTIONS = {
  SET_ROM: 'SET_ROM',
  SET_ROOM: 'SET_ROOM',
  SET_PLAYERS: 'SET_PLAYERS',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  SET_LINK_CABLE_STATUS: 'SET_LINK_CABLE_STATUS',
  SET_GAME_STATE: 'SET_GAME_STATE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  RESET_STATE: 'RESET_STATE',
};

// Initial state
const initialState = {
  // ROM and game state
  romFile: null,
  gameState: 'idle', // idle, loading, ready, playing, paused
  
  // Room and multiplayer state
  currentRoom: null,
  playerId: null,
  isHost: false,
  connectedPlayers: [],
  
  // Connection state
  isConnected: false,
  linkCableConnected: false,
  
  // UI state
  isLoading: false,
  error: null,
};

// Reducer
const gameReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_ROM:
      return { ...state, romFile: action.payload };
    
    case ACTIONS.SET_ROOM:
      return { 
        ...state, 
        currentRoom: action.payload.room,
        playerId: action.payload.playerId,
        isHost: action.payload.isHost
      };
    
    case ACTIONS.SET_PLAYERS:
      return { 
        ...state, 
        connectedPlayers: action.payload,
        linkCableConnected: action.payload.length >= 2
      };
    
    case ACTIONS.SET_CONNECTION_STATUS:
      return { ...state, isConnected: action.payload };
    
    case ACTIONS.SET_LINK_CABLE_STATUS:
      return { ...state, linkCableConnected: action.payload };
    
    case ACTIONS.SET_GAME_STATE:
      return { ...state, gameState: action.payload };
    
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ACTIONS.RESET_STATE:
      return { ...initialState, romFile: state.romFile };
    
    default:
      return state;
  }
};

// Context
const GameContext = createContext();

// Provider component
export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { toast } = useToast();

  // WebSocket message handlers
  useEffect(() => {
    const unsubscribeHandlers = [];

    // Room joined handler
    unsubscribeHandlers.push(
      websocketService.onMessage('room_joined', (data) => {
        dispatch({ type: ACTIONS.SET_PLAYERS, payload: data.room.players });
        dispatch({ type: ACTIONS.SET_CONNECTION_STATUS, payload: true });
        toast({
          title: "Connected to Room",
          description: data.message,
        });
      })
    );

    // Player joined handler
    unsubscribeHandlers.push(
      websocketService.onMessage('player_joined', (data) => {
        dispatch({ type: ACTIONS.SET_PLAYERS, payload: data.room.players });
        toast({
          title: "Player Joined",
          description: data.message,
        });
      })
    );

    // Player left handler
    unsubscribeHandlers.push(
      websocketService.onMessage('player_left', (data) => {
        dispatch({ type: ACTIONS.SET_PLAYERS, payload: data.room.players });
        toast({
          title: "Player Left",
          description: `${data.player_name} has left the room`,
        });
      })
    );

    // Player disconnected handler
    unsubscribeHandlers.push(
      websocketService.onMessage('player_disconnected', (data) => {
        dispatch({ type: ACTIONS.SET_PLAYERS, payload: data.room.players });
        toast({
          title: "Player Disconnected",
          description: `${data.player_name} has disconnected`,
          variant: "destructive",
        });
      })
    );

    // Link cable data handler
    unsubscribeHandlers.push(
      websocketService.onMessage('link_cable_data', (data) => {
        // Handle incoming link cable data
        console.log('Received link cable data:', data);
        
        // This would be passed to the emulator
        if (window.emulator && window.emulator.receiveLinkCableData) {
          window.emulator.receiveLinkCableData(data.action, data.payload);
        }
      })
    );

    // Save state response handler
    unsubscribeHandlers.push(
      websocketService.onMessage('save_state_response', (data) => {
        if (data.success) {
          toast({
            title: data.action === 'save' ? "Game Saved" : "Game Loaded",
            description: data.message,
          });
          
          if (data.action === 'load' && data.save_data) {
            // Load the save data into emulator
            if (window.emulator && window.emulator.loadSaveData) {
              window.emulator.loadSaveData(data.save_data);
            }
          }
        } else {
          toast({
            title: "Save/Load Failed",
            description: data.message,
            variant: "destructive",
          });
        }
      })
    );

    // Error handler
    unsubscribeHandlers.push(
      websocketService.onMessage('error', (data) => {
        dispatch({ type: ACTIONS.SET_ERROR, payload: data.message });
        toast({
          title: "Connection Error",
          description: data.message,
          variant: "destructive",
        });
      })
    );

    // Cleanup handlers on unmount
    return () => {
      unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
    };
  }, [toast]);

  // Actions
  const actions = {
    // ROM management
    loadRom: (romData) => {
      dispatch({ type: ACTIONS.SET_ROM, payload: romData });
      dispatch({ type: ACTIONS.SET_GAME_STATE, payload: 'ready' });
    },

    removeRom: () => {
      dispatch({ type: ACTIONS.SET_ROM, payload: null });
      dispatch({ type: ACTIONS.SET_GAME_STATE, payload: 'idle' });
    },

    // Room management
    createRoom: async (playerName) => {
      try {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
        
        const response = await roomAPI.createRoom(
          playerName, 
          state.romFile?.name
        );
        
        if (response.success) {
          dispatch({ 
            type: ACTIONS.SET_ROOM, 
            payload: {
              room: response.room_id,
              playerId: response.player_id,
              isHost: true
            }
          });
          
          // Connect to WebSocket
          await websocketService.connect(response.player_id, response.room_id);
          websocketService.startHeartbeat();
          
          return response.room_id;
        } else {
          throw new Error(response.message || 'Failed to create room');
        }
      } catch (error) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
        toast({
          title: "Failed to Create Room",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      } finally {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    },

    joinRoom: async (roomId, playerName) => {
      try {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
        
        const response = await roomAPI.joinRoom(
          roomId, 
          playerName, 
          state.romFile?.name
        );
        
        if (response.success) {
          dispatch({ 
            type: ACTIONS.SET_ROOM, 
            payload: {
              room: response.room.id,
              playerId: response.player_id,
              isHost: false
            }
          });
          
          dispatch({ type: ACTIONS.SET_PLAYERS, payload: response.room.players });
          
          // Connect to WebSocket
          await websocketService.connect(response.player_id, response.room.id);
          websocketService.startHeartbeat();
          
          return response.room.id;
        } else {
          throw new Error(response.message || 'Failed to join room');
        }
      } catch (error) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
        toast({
          title: "Failed to Join Room",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      } finally {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    },

    leaveRoom: () => {
      websocketService.stopHeartbeat();
      websocketService.disconnect();
      dispatch({ type: ACTIONS.RESET_STATE });
      
      toast({
        title: "Left Room",
        description: "You have left the multiplayer room",
      });
    },

    // Game controls
    setGameState: (gameState) => {
      dispatch({ type: ACTIONS.SET_GAME_STATE, payload: gameState });
      websocketService.updatePlayerStatus(gameState);
    },

    // Link cable functions
    sendLinkCableData: (action, payload) => {
      if (state.linkCableConnected) {
        return websocketService.sendLinkCableData(action, payload);
      }
      return false;
    },

    // Save state functions
    saveGameState: (saveData, screenshot) => {
      return websocketService.saveGameState(saveData, screenshot);
    },

    loadGameState: () => {
      return websocketService.loadGameState();
    },

    // Get available rooms
    getAvailableRooms: async () => {
      try {
        const response = await roomAPI.getAvailableRooms();
        return response.rooms || [];
      } catch (error) {
        console.error('Error getting available rooms:', error);
        return [];
      }
    },
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Hook to use the game context
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export default GameContext;