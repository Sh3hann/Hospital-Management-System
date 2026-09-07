// ================================================================
// backend/middleware/audit.js
// Audit Trail Middleware
// Automatically logs all write operations (POST/PUT/PATCH/DELETE)
// to the audit_logs MySQL table.
// ================================================================
const { run } = require('../config/db');

/**
 * Extract the HMS module name from the request URL.
 * e.g. /api/patients/5 → 'Patients'
 */
function extractModule(url) {
  const match = url.match(/^\/api\/([^/?]+)/i);
  if (!match) return 'Unknown';
  return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
}

/**
 * Audit trail middleware.
 * Attach AFTER authenticateToken so req.user is available.
 */
function auditTrail(req, res, next) {
  const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!WRITE_METHODS.includes(req.method)) return next();

  // Intercept the response so we can log after it resolves
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const statusCode = res.statusCode;

    // Only log successful writes (2xx)
    if (statusCode >= 200 && statusCode < 300 && req.user) {
      const module    = extractModule(req.originalUrl || req.url);
      const action    = req.method;
      const recordId  = req.params?.id ? parseInt(req.params.id) : (body?.id || null);
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
      const details   = JSON.stringify({
        url:    req.originalUrl,
        body:   sanitizeBody(req.body),
      });

      // Fire-and-forget — don't block the response
      run(
        `INSERT INTO audit_logs (user_id, action, module, record_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, action, module, recordId, details, ipAddress]
      ).catch(err => console.error('[Audit] Log error:', err.message));
    }

    return originalJson(body);
  };

  next();
}

/**
 * Remove sensitive fields from the body before logging.
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return {};
  const sanitized = { ...body };
  ['password', 'password_hash', 'current_password', 'new_password', 'file_data'].forEach(k => {
    if (k in sanitized) sanitized[k] = '[REDACTED]';
  });
  return sanitized;
}

module.exports = { auditTrail };
