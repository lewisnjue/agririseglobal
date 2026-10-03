const express = require('express');
const router = express.Router();
const { register, login, me, updateProfile, getPublicProfile, createUser, listUsers, updateUser, deleteUser, getSetupStatus } = require('../controllers/authController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/setup-status', getSetupStatus);
router.post('/register', register); // Only for first admin
router.post('/login', login);
router.get('/me', auth, me);
router.put('/me', auth, updateProfile);
router.get('/profile/:id', getPublicProfile);

// Admin only routes
router.post('/users', admin, createUser);
router.get('/users', admin, listUsers);
router.put('/users/:id', admin, updateUser);
router.delete('/users/:id', admin, deleteUser);

module.exports = router;
