const messageService = require('../services/messageService');

async function sendMessage(req, res) {
  try {
    const { groupId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content && !req.file) {
      return res.status(400).json({ error: 'Message content or file is required' });
    }

    const fileData = req.file
      ? {
          file_url: `/uploads/${req.file.filename}`,
          file_name: req.file.originalname,
          file_size: req.file.size,
        }
      : null;

    const message = await messageService.sendMessage(
      parseInt(groupId),
      userId,
      content || '',
      fileData
    );

    res.status(201).json({ message: 'Message sent', data: message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function sendImage(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    console.log('📸 sendImage called:', { groupId, userId, hasFile: !!req.file });

    if (!req.file) {
      console.log('❌ No file provided');
      return res.status(400).json({ error: 'Image file is required' });
    }

    console.log('📄 File info:', { 
      filename: req.file.filename, 
      mimetype: req.file.mimetype, 
      size: req.file.size 
    });

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      console.log('❌ Invalid file type:', req.file.mimetype);
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', req.file.size);
      return res.status(400).json({ error: 'Image size must be less than 5MB' });
    }

    const fileData = {
      file_url: `/uploads/${req.file.filename}`,
      file_name: req.file.originalname,
      file_size: req.file.size,
    };

    console.log('💾 Saving message with file data:', fileData);

    const message = await messageService.sendMessage(
      parseInt(groupId),
      userId,
      '[Image]',
      fileData
    );

    console.log('✅ Message saved:', message);

    res.status(201).json({ message: 'Image sent', data: message });
  } catch (err) {
    console.error('❌ sendImage error:', err);
    res.status(400).json({ error: err.message });
  }
}

async function getMessages(req, res) {
  try {
    const { groupId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await messageService.getGroupMessages(
      parseInt(groupId),
      parseInt(limit),
      parseInt(offset)
    );

    res.status(200).json(messages);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    await messageService.deleteMessage(parseInt(messageId), userId);
    res.status(200).json({ message: 'Message deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function markAsRead(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const readCount = await messageService.markMessageAsRead(
      parseInt(messageId),
      userId
    );

    res.status(200).json({ message: 'Message marked as read', readCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getReaders(req, res) {
  try {
    const { messageId } = req.params;

    const readers = await messageService.getMessageReaders(parseInt(messageId));
    res.status(200).json(readers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function searchMessages(req, res) {
  try {
    const { groupId } = req.params;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search term required' });
    }

    const messages = await messageService.searchMessages(parseInt(groupId), q);
    res.status(200).json(messages);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function addReaction(req, res) {
  try {
    const { messageId } = req.params;
    const { reactionType } = req.body;
    const userId = req.userId;

    if (!reactionType) {
      return res.status(400).json({ error: 'Reaction type is required' });
    }

    const reaction = await messageService.addReaction(
      parseInt(messageId),
      userId,
      reactionType
    );

    res.status(201).json({ message: 'Reaction added', data: reaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function removeReaction(req, res) {
  try {
    const { messageId } = req.params;
    const { reactionType } = req.body;
    const userId = req.userId;

    if (!reactionType) {
      return res.status(400).json({ error: 'Reaction type is required' });
    }

    const reaction = await messageService.removeReaction(
      parseInt(messageId),
      userId,
      reactionType
    );

    res.status(200).json({ message: 'Reaction removed', data: reaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getReactions(req, res) {
  try {
    const { messageId } = req.params;

    const reactions = await messageService.getMessageReactions(parseInt(messageId));
    res.status(200).json(reactions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  sendMessage,
  sendImage,
  getMessages,
  deleteMessage,
  markAsRead,
  getReaders,
  searchMessages,
  addReaction,
  removeReaction,
  getReactions,
};
