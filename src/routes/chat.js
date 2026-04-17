const express = require('express');
const router = express.Router();

const chatController = require('../controllers/roomController');
const requireAuth = require('../middleware/requireAuth');

router.get('/', chatController.getRooms);

router.post('/rooms', requireAuth, chatController.createRoom);

router.get('/rooms/:id', requireAuth, chatController.getRoomById);

// router.post('/rooms/:id/messages', requireAuth, chatController.postMessage);

module.exports = router;
