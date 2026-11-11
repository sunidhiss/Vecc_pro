const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/gamesController');
const { verifyToken } = require('../middleware/auth');

router.get('/today', verifyToken, gamesController.getStatus);

router.get('/wordle', verifyToken, gamesController.getWordle);
router.post('/wordle/guess', verifyToken, gamesController.submitWordleGuess);

router.get('/quiz/:type', verifyToken, gamesController.getQuiz);
router.post('/quiz/:type/submit', verifyToken, gamesController.submitQuiz);

router.get('/unscramble', verifyToken, gamesController.getUnscramble);
router.post('/unscramble/submit', verifyToken, gamesController.submitUnscramble);

module.exports = router;
