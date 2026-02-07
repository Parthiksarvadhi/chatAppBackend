const express = require('express');
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/presence', userController.getPresence);
router.get('/groups/:groupId/presence', userController.getGroupPresence);
router.post('/push-token', userController.savePushToken);
router.post('/test-notification', userController.sendTestNotification);

module.exports = router;
