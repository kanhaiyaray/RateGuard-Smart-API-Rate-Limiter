// server/src/middleware/activityLogger.js
const activityLogger = (req, res, next) => {
  const start = Date.now();
  
  // Store original end method
  const originalEnd = res.end;
  
  // Override end method to capture response data
  res.end = function(...args) {
    const responseTime = Date.now() - start;
    
    // Skip logging for health check and static files
    if (req.path === '/health' || req.path.startsWith('/static') || req.path === '/ws-status') {
      return originalEnd.call(this, ...args);
    }
    
    // Create activity entry
    const activity = {
      type: 'request',
      app: req.headers['x-app-name'] || 'rateguard',
      userId: req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'anonymous',
      endpoint: req.path,
      method: req.method,
      status: res.statusCode,
      responseTime: responseTime,
      ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      isBlocked: res.statusCode === 429,
      timestamp: new Date().toISOString()
    };
    
    // Send to WebSocket service if available
    if (global.wsService) {
      try {
        global.wsService.addActivity(activity);
      } catch (err) {
        // Silently fail - don't crash the request
      }
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${activity.method} ${activity.endpoint} → ${activity.status} (${activity.responseTime}ms)`);
    }
    
    // Call original end method
    originalEnd.call(this, ...args);
  };
  
  next();
};

module.exports = activityLogger;