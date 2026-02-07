const express = require('express');
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/:groupId/send', upload.single('file'), messageController.sendMessage);
router.post('/:groupId/send-image', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, messageController.sendImage);

router.get('/:groupId', messageController.getMessages);
router.delete('/:messageId', messageController.deleteMessage);
router.post('/:messageId/read', messageController.markAsRead);
router.get('/:messageId/readers', messageController.getReaders);
router.get('/:groupId/search', messageController.searchMessages);

// Reaction routes
router.post('/:messageId/react', messageController.addReaction);
router.delete('/:messageId/react', messageController.removeReaction);
router.get('/:messageId/reactions', messageController.getReactions);

module.exports = router;
