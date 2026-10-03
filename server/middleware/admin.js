const auth = require('./auth');

const admin = (req, res, next) => {
  auth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

module.exports = admin;
