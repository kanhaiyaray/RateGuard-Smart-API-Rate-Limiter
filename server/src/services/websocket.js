// server/src/services/websocket.js
const WebSocket = require('ws');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });
    this.clients = new Map();
    this.activityHistory = [];
    this.maxHistory = 1000;
    this.setup();
    console.log('✅ WebSocket server initialized on /ws');
  }

  setup() {
    this.wss.on('connection', (ws) => {
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      
      // Store connection
      if (!this.clients.has(id)) {
        this.clients.set(id, ws);
      }

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        data: {
          status: 'connected',
          id: id,
          timestamp: new Date().toISOString()
        }
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (err) {
          // Ignore invalid messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(id);
      });

      ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message);
        this.clients.delete(id);
      });
    });
  }

  addActivity(activity) {
    const enrichedActivity = {
      ...activity,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString()
    };

    this.activityHistory.push(enrichedActivity);
    
    if (this.activityHistory.length > this.maxHistory) {
      this.activityHistory.shift();
    }

    // Broadcast to all connected clients
    this.broadcast({
      type: 'activity',
      data: enrichedActivity
    });

    return enrichedActivity;
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  getStatus() {
    let activeConnections = 0;
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        activeConnections++;
      }
    });

    return {
      activeConnections,
      activeUsers: activeConnections,
      historyCount: this.activityHistory.length,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WebSocketService;