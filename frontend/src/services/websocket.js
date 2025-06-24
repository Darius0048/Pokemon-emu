class WebSocketService {
  constructor() {
    this.ws = null;
    this.socketId = null;
    this.playerId = null;
    this.roomId = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Generate a unique socket ID
  generateSocketId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Connect to WebSocket server
  connect(playerId, roomId) {
    return new Promise((resolve, reject) => {
      try {
        this.playerId = playerId;
        this.roomId = roomId;
        this.socketId = this.generateSocketId();
        
        const wsUrl = process.env.REACT_APP_BACKEND_URL.replace(/^http/, 'ws');
        const wsEndpoint = `${wsUrl}/ws/${this.socketId}`;
        
        console.log('Connecting to WebSocket:', wsEndpoint);
        
        this.ws = new WebSocket(wsEndpoint);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send join room message
          this.sendMessage('join_room', { player_id: this.playerId });
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          
          // Try to reconnect if it wasn't a deliberate close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.playerId && this.roomId) {
        this.connect(this.playerId, this.roomId)
          .catch(error => {
            console.error('Reconnect failed:', error);
          });
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  // Disconnect from WebSocket
  disconnect() {
    if (this.ws) {
      this.isConnected = false;
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.socketId = null;
    this.playerId = null;
    this.roomId = null;
  }

  // Send a message through WebSocket
  sendMessage(type, data = {}) {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }
    
    const message = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  // Handle incoming messages
  handleMessage(message) {
    const { type, data } = message;
    
    console.log('Received WebSocket message:', type, data);
    
    // Call registered handlers
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in message handler for ${type}:`, error);
      }
    });
  }

  // Register a message handler
  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
    
    // Return a function to unregister the handler
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  // Send link cable data
  sendLinkCableData(action, payload = {}) {
    return this.sendMessage('link_cable_data', {
      action,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  // Update player status
  updatePlayerStatus(status) {
    return this.sendMessage('player_status', {
      status,
    });
  }

  // Save game state
  saveGameState(saveData, screenshot = null) {
    return this.sendMessage('save_state', {
      action: 'save',
      save_data: saveData,
      screenshot,
      timestamp: new Date().toISOString(),
    });
  }

  // Load game state
  loadGameState() {
    return this.sendMessage('save_state', {
      action: 'load',
    });
  }

  // Send ping to keep connection alive
  ping() {
    return this.sendMessage('ping');
  }

  // Start heartbeat to keep connection alive
  startHeartbeat(interval = 30000) {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, interval);
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socketId,
      playerId: this.playerId,
      roomId: this.roomId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;