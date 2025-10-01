const router = require('express').Router();
const { registrar, login, me, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', registrar);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
