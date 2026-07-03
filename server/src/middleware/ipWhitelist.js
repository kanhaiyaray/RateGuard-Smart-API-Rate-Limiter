const ipWhitelist = (req, res, next) => {
  const allowedIPs = (process.env.ADMIN_IP_WHITELIST || '').split(',').map((ip) => ip.trim()).filter(Boolean);
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

  if (allowedIPs.length === 0) {
    return next();
  }

  if (allowedIPs.includes(clientIP)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied from this IP address',
  });
};

module.exports = ipWhitelist;
