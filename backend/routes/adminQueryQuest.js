const express = require('express');
const router = express.Router();
const adminQueryQuestController = require('../controllers/adminQueryQuestController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/challenges', verifyToken, requireAdmin, adminQueryQuestController.listChallenges);
router.post('/challenges', verifyToken, requireAdmin, adminQueryQuestController.createChallenge);
router.put('/challenges/:id', verifyToken, requireAdmin, adminQueryQuestController.updateChallenge);
router.delete('/challenges/:id', verifyToken, requireAdmin, adminQueryQuestController.deleteChallenge);

module.exports = router;
