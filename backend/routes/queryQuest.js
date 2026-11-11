const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const queryQuestController = require('../controllers/queryQuestController');
const { verifyToken } = require('../middleware/auth');

const executeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many SQL executions. Please wait a moment before running another query.' },
});

router.get('/today', verifyToken, queryQuestController.getTodayChallenges);
router.get('/challenges/:id', verifyToken, queryQuestController.getChallengeById);
router.post('/execute', verifyToken, executeLimiter, queryQuestController.executeQuery);
router.post('/hint', verifyToken, queryQuestController.requestHint);
router.get('/progress', verifyToken, queryQuestController.getProgress);
router.get('/leaderboard', queryQuestController.getLeaderboard);

module.exports = router;
