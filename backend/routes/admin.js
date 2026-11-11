const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.post('/games/:gameType', verifyToken, requireAdmin, adminController.setDailyGame);
router.get('/games/:gameType', verifyToken, requireAdmin, adminController.getDailyGame);

module.exports = router;
