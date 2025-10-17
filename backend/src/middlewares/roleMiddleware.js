// Middleware for role-based access control
function requireRole(roles) {
  // Accept single role or array of roles
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

// Convenience functions for common role checks
const requireAdmin = () => requireRole('admin');
const requireCollector = () => requireRole(['collector', 'admin']);
const requireResident = () => requireRole('resident');

module.exports = {
  requireRole,
  requireAdmin,
  requireCollector,
  requireResident
};
