// server/src/server.js
require('dotenv').config(); // ✅ Must be at the top
const app = require('./app');
const connectDB = require('./config/db');
const redisClient = require('./config/redis');
const { validateConfig, getConfigSummary, SERVER } = require('./config/constants');
const { createAdminUserIfMissing } = require('./utils/bootstrapAdmin');

const PORT = SERVER.PORT || 5000;

// ============ VALIDATE ENVIRONMENT VARIABLES ============
if (!validateConfig()) {
  console.error('\n⚠️  Please fix the missing environment variables and restart.');
  process.exit(1);
}

// ============ CONFIGURATION SUMMARY ============
console.log('\n📊 Configuration Summary:');
const summary = getConfigSummary();
console.log(`   Environment: ${summary.environment}`);
console.log(`   Port: ${summary.port}`);
console.log(`   Frontend URL: ${summary.frontendUrl}`);
console.log(`   API Version: ${summary.apiVersion}`);
console.log(`   Plan Limits: FREE=${summary.planLimits.FREE}, PREMIUM=${summary.planLimits.PREMIUM}, ADMIN=${summary.planLimits.ADMIN}`);
console.log(`   Rate Limit Window: ${summary.rateLimit.windowSeconds}s`);
console.log(`   Auth Max Attempts: ${summary.rateLimit.authMaxAttempts}`);
console.log(`   JWT Expires: ${summary.jwt.expiresIn}`);
console.log(`   Features: ${JSON.stringify(summary.features)}`);
console.log('');

let serverInstance;
let wsService;

// ============ START SERVER WITH PROPER CONNECTION ORDER ============
(async () => {
  try {
    // 1. Connect to MongoDB first
    await connectDB();
    console.log('✅ MongoDB connected');

    // 2. Connect to Redis
    await redisClient.connect();
    console.log('✅ Redis connected');

    // 3. Bootstrap the initial admin user when needed
    await createAdminUserIfMissing();

    // 4. Start the server
    serverInstance = app.listen(PORT, () => {
      console.log(`\n🚀 RateGuard server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log('\n✅ Server is ready!');

      // ============ ✅ Initialize WebSocket service (if available) ============
      try {
        const WebSocketService = require('./services/websocket');
        wsService = new WebSocketService(serverInstance);
        console.log(`📍 WebSocket: ws://localhost:${PORT}/ws`);
        console.log('✅ WebSocket service initialized');
        // Expose for use in controllers and middleware
        global.wsService = wsService;
      } catch (err) {
        console.warn('⚠️ WebSocket service not available:', err.message);
        global.wsService = null;
      }

      // ============ START ALERT SERVICE (if available) ============
      try {
        const AlertService = require('./services/alertService');
        const alertService = new AlertService();
        alertService.start(30000); // Check every 30 seconds
        global.alertService = alertService;
        console.log('✅ Alert service started');
      } catch (err) {
        console.warn('⚠️ Alert service not available:', err.message);
        global.alertService = null;
      }

      // ============ WARM PREDICTIVE ANALYTICS CACHE (if available) ============
      try {
        const PredictiveAnalytics = require('./services/predictiveAnalytics');
        // Pre-warm cache after 5 seconds
        setTimeout(async () => {
          try {
            await PredictiveAnalytics.predictUsage('all', 7);
            console.log('✅ Predictive analytics cache warmed');
          } catch (err) {
            // Silent fail - will warm on first request
          }
        }, 5000);
      } catch (err) {
        console.warn('⚠️ Predictive analytics not available:', err.message);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('\n💡 Development Tips:');
        console.log('   - Press "rs" and Enter to restart the server');
        console.log('   - Changes to src/ will auto-reload');
        console.log(`   - Frontend URL: ${summary.frontendUrl}`);
        console.log(`   - Debug Mode: ${summary.features.ENABLE_DEBUG ? 'Enabled' : 'Disabled'}`);
        if (wsService) {
          console.log(`   - WebSocket Status: http://localhost:${PORT}/ws-status`);
        }
      }

      console.log('\n📈 Rate Limit Configuration:');
      console.log(`   FREE Plan: ${summary.planLimits.FREE} requests/min`);
      console.log(`   PREMIUM Plan: ${summary.planLimits.PREMIUM} requests/min`);
      console.log(`   ADMIN Plan: ${summary.planLimits.ADMIN}`);
      console.log(`   Window: ${summary.rateLimit.windowSeconds} seconds`);

      // Show WebSocket status if available
      if (wsService) {
        try {
          const status = wsService.getStatus();
          console.log('\n🔌 WebSocket Status:');
          console.log(`   Path: /ws`);
          console.log(`   Active Connections: ${status.activeConnections}`);
          console.log(`   Active Users: ${status.activeUsers}`);
        } catch (err) {
          // Ignore status errors
        }
      }
    });
  } catch (error) {
    console.error('❌ Startup error:', error.message);
    console.error('💥 Failed to initialize services. Exiting...');
    process.exit(1);
  }
})();

// ============ CLOSE SERVER HELPER ============
const closeServer = () => {
  return new Promise((resolve, reject) => {
    if (!serverInstance) {
      return resolve();
    }

    if (!serverInstance.listening) {
      return resolve();
    }

    serverInstance.close((err) => {
      if (err) return reject(err);
      console.log('✅ HTTP server closed');
      resolve();
    });
  });
};

// ============ GRACEFUL SHUTDOWN ============
const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal} signal, shutting down gracefully...`);

  // Close WebSocket connections first
  if (wsService) {
    try {
      // Close all WebSocket connections
      wsService.wss?.clients?.forEach((client) => {
        client.close(1000, 'Server shutting down');
      });
      console.log('✅ WebSocket connections closed');
    } catch (err) {
      console.error('❌ Error closing WebSocket connections:', err.message);
    }
  }

  // Stop alert service
  if (global.alertService) {
    try {
      global.alertService.stop();
      console.log('✅ Alert service stopped');
    } catch (err) {
      console.error('❌ Error stopping alert service:', err.message);
    }
  }

  // Close HTTP server
  try {
    await closeServer();
  } catch (err) {
    console.error('❌ Error closing HTTP server:', err.message);
  }

  // Close Redis connection
  try {
    await redisClient.quit();
    console.log('✅ Redis connection closed');
  } catch (err) {
    console.error('❌ Error closing Redis connection:', err.message);
  }

  // Close MongoDB connection
  try {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (err) {
    console.error('❌ Error closing MongoDB connection:', err.message);
  }

  console.log('👋 Goodbye!');
  process.exit(0);
};

// ============ PROCESS EVENT HANDLERS ============

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  await shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  await shutdown('unhandledRejection');
});

// ============ EXPORT FOR TESTING ============
module.exports = { serverInstance, wsService };