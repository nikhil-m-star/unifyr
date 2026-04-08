const express = require('express');
const { recommendEvents } = require('../controllers/aiController');

const router = express.Router();

router.post('/recommend-events', recommendEvents);

module.exports = router;

