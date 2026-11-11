const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

router.get('/students', leaderboardController.getStudents);
router.get('/departments', leaderboardController.getDepartments);

module.exports = router;
