const userService = require('../services/userService');

async function getProfile(req, res) {
  try {
    const userId = req.userId;
    const profile = await userService.getUserProfile(userId);
    res.status(200).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.userId;
    const { avatar_url, bio, phone, location } = req.body;

    const profile = await userService.updateUserProfile(userId, {
      avatar_url,
      bio,
      phone,
      location,
    });

    res.status(200).json({ message: 'Profile updated', profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getPresence(req, res) {
  try {
    const userId = req.userId;
    const presence = await userService.getUserPresence(userId);
    res.status(200).json(presence);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getGroupPresence(req, res) {
  try {
    const { groupId } = req.params;
    const presence = await userService.getGroupPresence(parseInt(groupId));
    res.status(200).json(presence);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function savePushToken(req, res) {
  try {
    const userId = req.userId;
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    const result = await userService.savePushToken(userId, pushToken);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function sendTestNotification(req, res) {
  try {
    const userId = req.userId;
    console.log('🧪 TEST NOTIFICATION - Step 1: Request received from user:', userId);

    const sendPush = require('../utils/sendPush');
    console.log('🧪 TEST NOTIFICATION - Step 2: sendPush module loaded');

    // Get user's push token
    let pushToken;
    try {
      console.log('🧪 TEST NOTIFICATION - Step 3: Fetching push token for user:', userId);
      pushToken = await userService.getPushToken(userId);
      console.log('🧪 TEST NOTIFICATION - Step 4: Push token found:', pushToken);
    } catch (err) {
      console.log('❌ TEST NOTIFICATION - Step 4 FAILED: No push token found:', err.message);
      return res.status(400).json({ error: 'No push token found. Please login again to register your device.' });
    }

    if (!pushToken) {
      console.log('❌ TEST NOTIFICATION - Step 5: Push token is null/empty');
      return res.status(400).json({ error: 'Push token is empty. Please login again.' });
    }

    console.log('🧪 TEST NOTIFICATION - Step 5: Push token is valid');
    console.log('🧪 TEST NOTIFICATION - Step 6: Calling sendPush with token:', pushToken);

    // Send test notification
    await sendPush(
      [pushToken],
      '🧪 Test Notification',
      'This is a test notification from your chat app!',
      {
        type: 'test',
        timestamp: new Date().toISOString(),
      }
    );

    console.log('🧪 TEST NOTIFICATION - Step 7: sendPush completed successfully');

    res.status(200).json({ 
      success: true, 
      message: 'Test notification sent',
      pushToken: pushToken 
    });
  } catch (err) {
    console.error('❌ TEST NOTIFICATION - FINAL ERROR:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getPresence,
  getGroupPresence,
  savePushToken,
  sendTestNotification,
};
