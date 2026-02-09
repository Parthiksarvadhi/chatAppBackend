const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('⚠️ Firebase Admin not initialized:', error.message);
  }
}

async function sendPushNotification(tokens, title, body, extraData = {}) {
  console.log('🔔 sendPushNotification called with:', { tokensCount: tokens.length, title, body });
  
  if (!tokens || tokens.length === 0) {
    console.log('⚠️ No tokens provided');
    return;
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type: 'message',
        timestamp: new Date().toISOString(),
        ...extraData,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send to multiple tokens
    const response = await admin.messaging().sendMulticast({
      ...message,
      tokens,
    });

    console.log('✅ Firebase notifications sent:');
    console.log('   Success:', response.successCount);
    console.log('   Failed:', response.failureCount);

    // Log failed tokens
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log('❌ Failed token:', tokens[idx], resp.error.message);
        }
      });
    }

    return response;
  } catch (error) {
    console.error('❌ Firebase notification error:', error);
    throw error;
  }
}

module.exports = sendPushNotification;
