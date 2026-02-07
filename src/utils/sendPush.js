const { Expo } = require("expo-server-sdk");

const expo = new Expo();

async function sendPushNotification(tokens, title, body, extraData = {}) {
  console.log('🔔 sendPushNotification called with:', { tokensCount: tokens.length, title, body, extraData });
  const messages = [];

  for (let token of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.log('❌ Invalid token format:', token);
      continue;
    }

    console.log('✅ Valid token:', token);
    messages.push({
      to: token,
      sound: "default",
      title,
      body,
      data: {
        type: 'message',
        timestamp: new Date().toISOString(),
        ...extraData,
      },
      badge: 1,
      priority: 'high',
    });
  }

  console.log('📨 Prepared', messages.length, 'messages to send');

  const chunks = expo.chunkPushNotifications(messages);
  console.log('📦 Split into', chunks.length, 'chunks');

  for (let chunk of chunks) {
    try {
      console.log('📤 Sending chunk with', chunk.length, 'messages');
      const result = await expo.sendPushNotificationsAsync(chunk);
      console.log('✅ Chunk sent successfully:', result);
    } catch (error) {
      console.error('❌ Error sending chunk:', error);
    }
  }
}

module.exports = sendPushNotification;
