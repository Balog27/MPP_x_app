// WebSocket service for real-time communication
class WebSocketService {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.eventListeners = {
      connectionChange: [],
      newPost: [],
      generatorStatus: [],
      generationStats: []
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
  }

  // Connect to the WebSocket server
  connect() {
    try {
      // Convert http(s) to ws(s)
      const wsUrl = this.serverUrl.replace(/^http/, 'ws');
      this.socket = new WebSocket(`${wsUrl}`);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this._notifyListeners('connectionChange', true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch(data.type) {
            case 'newPost':
              this._notifyListeners('newPost', data.post);
              break;
            case 'generatorStatus':
              this._notifyListeners('generatorStatus', data.active);
              break;
            case 'generationStats':
              this._notifyListeners('generationStats', data.stats);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this._notifyListeners('connectionChange', false);
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectTimeout = setTimeout(() => this.connect(), 2000);
          this.reconnectAttempts++;
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  // Disconnect from the WebSocket server
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Add event listener
  addEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  // Remove event listener
  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        cb => cb !== callback
      );
    }
  }

  _notifyListeners(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  // Control methods for the post generator
  startGenerator() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'startGenerator' }));
    }
  }

  stopGenerator() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'stopGenerator' }));
    }
  }
}

export default WebSocketService;