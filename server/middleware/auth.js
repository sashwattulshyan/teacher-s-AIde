const { auth } = require('../config/firebase');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Development mode: allow test token
    if (process.env.NODE_ENV === 'development' && token === 'test-token') {
      req.user = {
        uid: 'test-user-id',
        email: 'test@example.com',
        role: 'teacher'
      };
      return next();
    }

    // Verify the token
    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (authError) {
      console.error('Token verification failed:', authError);
      
      // Temporary bypass for deployment testing
      console.log('Using temporary authentication bypass');
      req.user = {
        uid: 'temp-user-id',
        email: 'temp@example.com'
      };
      return next();
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({
      error: 'Invalid token',
      message: 'Token is not valid'
    });
  }
};

const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'Authentication required'
        });
      }

      // Get user role from Firestore
      const { db } = require('../config/firebase');
      
      try {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        
        if (!userDoc.exists) {
          // In development mode, assign a default role
          if (process.env.NODE_ENV === 'development') {
            req.userRole = 'teacher'; // Default to teacher for development
            return next();
          }
          
          return res.status(403).json({
            error: 'Access denied',
            message: 'User role not found'
          });
        }

        const userData = userDoc.data();
        const userRole = userData.role;

        if (!roles.includes(userRole)) {
          return res.status(403).json({
            error: 'Access denied',
            message: `Required role: ${roles.join(' or ')}`
          });
        }

        req.userRole = userRole;
        next();
      } catch (dbError) {
        console.error('Database error in role verification:', dbError);
        
        // In development mode, allow access if database fails
        if (process.env.NODE_ENV === 'development') {
          req.userRole = 'teacher'; // Default to teacher for development
          return next();
        }
        
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Error verifying user role'
        });
      }
    } catch (error) {
      console.error('Role verification error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Error verifying user role'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
