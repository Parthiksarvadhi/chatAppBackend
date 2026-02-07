const express = require('express');
const groupController = require('../controllers/groupController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', groupController.createGroup);
router.get('/', groupController.listGroups);
router.get('/all', groupController.getAllGroups);
router.post('/:groupId/join', groupController.joinGroup);
router.get('/:groupId', groupController.getGroupDetails);
router.get('/:groupId/members', groupController.getGroupMembers);

module.exports = router;
