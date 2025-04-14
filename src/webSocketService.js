// WebSocket service for real-time communication
class WebSocketService {
    constructor(serverUrl) {
      this.serverUrl = serverUrl;
      this.socket = null;
      this.listeners = {
        newPost: [],
        generatorStatus: [],
        generationStats: [],
        connectionChange: []
      };
      this.isConnected = false;
      this.reconnectTimer = null;
    }
  
    // Connect to the WebSocket server
    connect() {
      // Make sure we close any existing connection first
      this.disconnect();
      
      // Replace http:// with ws:// or https:// with wss://
      const wsUrl = this.serverUrl.replace(/^http/, 'ws');
      
      try {
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          this.notifyListeners('connectionChange', true);
          
          // Clear any reconnection timer
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          
          // Request current stats
          this.socket.send(JSON.stringify({ action: 'getStats' }));
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'newPost') {
              this.notifyListeners('newPost', data.post);
              if (data.stats) {
                this.notifyListeners('generationStats', data.stats);
              }
            } else if (data.type === 'generatorStatus') {
              this.notifyListeners('generatorStatus', data.active);
              if (data.stats) {
                this.notifyListeners('generationStats', data.stats);
              }
            } else if (data.type === 'generationStats') {
              this.notifyListeners('generationStats', data.stats);
              this.notifyListeners('generatorStatus', data.isGenerating);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };
        
        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          this.isConnected = false;
          this.notifyListeners('connectionChange', false);
          
          // Attempt to reconnect after a delay
          this.reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect...');
            this.connect();
          }, 5000);
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
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      this.isConnected = false;
    }
    
    // Send a message to the server
    send(message) {
      if (this.socket && this.isConnected) {
        this.socket.send(JSON.stringify(message));
      } else {
        console.error('Cannot send message, WebSocket is not connected');
      }
    }
    
    // Start the post generator
    startGenerator() {
      this.send({ action: 'startGenerator' });
    }
    
    // Stop the post generator
    stopGenerator() {
      this.send({ action: 'stopGenerator' });
    }
    
    // Add event listener
    addEventListener(eventType, callback) {
      if (this.listeners[eventType]) {
        this.listeners[eventType].push(callback);
      }
      return () => this.removeEventListener(eventType, callback);
    }
    
    // Remove event listener
    removeEventListener(eventType, callback) {
      if (this.listeners[eventType]) {
        this.listeners[eventType] = this.listeners[eventType]
          .filter(cb => cb !== callback);
      }
    }
    
    // Notify all listeners of a particular event type
    notifyListeners(eventType, data) {
      if (this.listeners[eventType]) {
        this.listeners[eventType].forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in ${eventType} listener:`, error);
          }
        });
      }
    }
  }
  
  export default WebSocketService;