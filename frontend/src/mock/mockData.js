// Mock data for frontend development - will be replaced with real backend integration

export const mockRooms = [
  {
    id: 'ABC123',
    host: 'TrainerAsh',
    players: [
      { name: 'TrainerAsh', isHost: true, status: 'ready' }
    ],
    gameType: 'Pokemon Fire Red',
    created: '2025-01-13T10:30:00Z'
  },
  {
    id: 'XYZ789',
    host: 'PokeMaster',
    players: [
      { name: 'PokeMaster', isHost: true, status: 'ready' }
    ],
    gameType: 'Pokemon Leaf Green', 
    created: '2025-01-13T11:15:00Z'
  },
  {
    id: 'DEF456',
    host: 'GymLeader',
    players: [
      { name: 'GymLeader', isHost: true, status: 'ready' },
      { name: 'Challenger', isHost: false, status: 'ready' }
    ],
    gameType: 'Pokemon Fire Red',
    created: '2025-01-13T09:45:00Z'
  }
];

export const mockPlayers = [
  { name: 'Player1', isHost: true, status: 'ready' },
  { name: 'Player2', isHost: false, status: 'connected' }
];

export const mockRomData = {
  name: 'Pokemon_Fire_Red.gba',
  size: 16777216, // 16MB
  isPokemon: true,
  uploadedAt: '2025-01-13T12:00:00Z'
};

export const mockGameStates = {
  loading: 'loading',
  ready: 'ready',
  playing: 'playing',
  paused: 'paused',
  error: 'error'
};

export const mockLinkCableActions = [
  'trade_request',
  'battle_request', 
  'trade_pokemon',
  'battle_start',
  'battle_action',
  'trade_complete',
  'battle_complete'
];

// Mock WebSocket-like functionality for development
export class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen({ type: 'open' });
    }, 100);
  }
  
  send(data) {
    console.log('Mock WebSocket send:', data);
    // Simulate receiving echo response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: JSON.stringify({
            type: 'echo',
            message: 'Mock response',
            timestamp: new Date().toISOString()
          })
        });
      }
    }, 200);
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ type: 'close' });
  }
}

// Mock API responses
export const mockApiResponses = {
  createRoom: (roomData) => ({
    success: true,
    room: {
      id: roomData.id || Math.random().toString(36).substring(2, 8).toUpperCase(),
      host: roomData.host || 'Anonymous',
      players: [
        { name: roomData.host || 'Anonymous', isHost: true, status: 'ready' }
      ],
      created: new Date().toISOString()
    }
  }),
  
  joinRoom: (roomId, playerName) => ({
    success: true,
    room: {
      id: roomId,
      host: 'ExistingHost',
      players: [
        { name: 'ExistingHost', isHost: true, status: 'ready' },
        { name: playerName || 'Anonymous', isHost: false, status: 'connected' }
      ]
    }
  }),
  
  uploadRom: (romFile) => ({
    success: true,
    rom: {
      id: Math.random().toString(36).substring(2, 15),
      name: romFile.name,
      size: romFile.size,
      isPokemon: /pokemon|fire\s*red|leaf\s*green/i.test(romFile.name),
      uploadedAt: new Date().toISOString()
    }
  })
};