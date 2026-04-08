const express = require('express');
const router = express.Router();
const utsavService = require('../services/utsavService');

router.get('/', async (req, res) => {
  try {
    const events = await utsavService.fetchUtsavEvents();
    res.status(200).json(events);
  } catch (error) {
    console.error('Failed to fetch Utsav events:', error);
    res.status(500).json({ message: 'Failed to synchronize with Utsav portal.' });
  }
});

module.exports = router;
