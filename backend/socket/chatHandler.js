const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');

const MAX_MESSAGES = 100;
let chatMessages = [];

// File to store chat messages persistently
const CHAT_FILE_PATH = path.join(__dirname, '../data/chat-messages.json');

// Load chat messages from file on startup
async function loadChatMessages() {
  try {
    await fs.access(path.dirname(CHAT_FILE_PATH));
  } catch {
    // Create data directory if it doesn't exist
    await fs.mkdir(path.dirname(CHAT_FILE_PATH), { recursive: true });
  }

  try {
    const data = await fs.readFile(CHAT_FILE_PATH, 'utf8');
    const messages = JSON.parse(data);
    // Convert timestamp strings back to Date objects
    chatMessages = messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    console.log(`Loaded ${chatMessages.length} chat messages from file`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error loading chat messages:', error);
    }
    chatMessages = [];
  }
}

// Save chat messages to file
async function saveChatMessages() {
  try {
    // Convert Date objects to ISO strings for storage
    const messagesForStorage = chatMessages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }));
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify(messagesForStorage, null, 2));
  } catch (error) {
    console.error('Error saving chat messages:', error);
  }
}

// Load messages on module initialization
loadChatMessages();

module.exports = function (io) {
  io.on('connection', async (socket) => {
    try {
      console.log('Socket connection attempt...');
      // Authenticate user
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log('No token provided, disconnecting socket');
        socket.emit('auth_error', { message: 'No authentication token provided. Please log in again.' });
        socket.disconnect(true);
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        console.log('JWT verification failed:', jwtError.message);
        if (jwtError.name === 'TokenExpiredError') {
          socket.emit('auth_error', { message: 'Your session has expired. Please log in again.' });
        } else {
          socket.emit('auth_error', { message: 'Invalid authentication token. Please log in again.' });
        }
        socket.disconnect(true);
        return;
      }
      const user = await User.findById(decoded.userId).select('-password');      if (!user) {
        console.log('User not found, disconnecting socket');
        socket.emit('auth_error', { message: 'User not found. Please log in again.' });
        socket.disconnect(true);
        return;
      }

      // Check if user has a valid free trial or subscription
      const now = new Date();
      const hasValidSubscription = user.accountExpiresAt && user.accountExpiresAt > now;
      const hasValidFreeTrial = user.freeTrialEndsAt && user.freeTrialEndsAt > now;

      if (!hasValidSubscription && !hasValidFreeTrial) {
        // Send a message to the client indicating why they were disconnected
        console.log(`User ${user.name} has expired subscription/trial, disconnecting`);
        socket.emit('auth_error', { message: 'Your subscription or free trial has expired. Please renew to access the chat.' });
        socket.disconnect(true);
        return;
      }

      console.log(`User connected: ${user.name} (${user._id})`);
      
      // Emit initial messages to this socket only
      const initialMessages = chatMessages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString() // Convert Date to ISO string for serialization
      }));
      socket.emit('initChat', initialMessages);      socket.on('newMessage', async (messageData) => {
        try {
          // Re-check auth on each message to handle cases where subscription expires mid-session
          const now = new Date();
          const hasValidSubscriptionOnMessage = user.accountExpiresAt && user.accountExpiresAt > now;
          const hasValidFreeTrialOnMessage = user.freeTrialEndsAt && user.freeTrialEndsAt > now;

          if (!hasValidSubscriptionOnMessage && !hasValidFreeTrialOnMessage) {
            socket.emit('auth_error', { message: 'Your subscription or free trial has expired. Please renew to access the chat.' });
            socket.disconnect(true);
            return;
          }          // Handle both string messages (legacy) and enhanced message objects
          let text, mentions, replyTo, messageId;
          
          console.log('Received messageData:', messageData);
          
          if (typeof messageData === 'string') {
            // Legacy string message
            text = messageData;
            mentions = [];
            replyTo = null;
            messageId = Date.now().toString();
          } else if (typeof messageData === 'object' && messageData.text) {
            // Enhanced message object
            text = messageData.text;
            mentions = messageData.mentions || [];
            replyTo = messageData.replyTo || null;
            messageId = messageData.id || Date.now().toString();
          } else {
            console.log('Invalid message format received from user:', user.name);
            return;
          }

          console.log('Processed message data:', { text, mentions, replyTo, messageId });

          if (!text || text.trim() === '') {
            console.log('Empty message received from user:', user.name);
            return;
          }          const message = {
            id: messageId,
            username: user.name,
            text: text.trim(),
            timestamp: new Date(),
            ...(mentions && mentions.length > 0 && { mentions }),
            ...(replyTo && { replyTo })
          };
          
          console.log(`📤 Creating message with mentions:`, mentions, 'and replyTo:', replyTo);
          console.log(`New message from ${user.name}:`, message);
          chatMessages.push(message);

          if (chatMessages.length > MAX_MESSAGES) {
            chatMessages.shift();
          }
          
          // Save messages to file for persistence
          await saveChatMessages();
          
          // Broadcast the message to all connected clients including sender
          // Convert Date to ISO string for serialization
          const broadcastMessage = {
            ...message,
            timestamp: message.timestamp.toISOString()
          };
          
          console.log('Broadcasting enhanced message to all clients:', broadcastMessage);
          io.emit('messageBroadcast', broadcastMessage);
        } catch (error) {
          console.error('Error handling new message:', error);
        }
      });

      socket.on('addReaction', async (data) => {
        try {
          const { messageId, emoji } = data;
          console.log(`User ${user.name} adding reaction ${emoji} to message ${messageId}`);
          
          // Find the message
          const messageIndex = chatMessages.findIndex(msg => msg.id === messageId);
          if (messageIndex === -1) {
            console.log('Message not found for reaction:', messageId);
            return;
          }
          
          const message = chatMessages[messageIndex];
          
          // Initialize reactions if not exists
          if (!message.reactions) {
            message.reactions = {};
          }
          
          // Initialize emoji array if not exists
          if (!message.reactions[emoji]) {
            message.reactions[emoji] = [];
          }
          
          // Toggle user's reaction
          const userIndex = message.reactions[emoji].indexOf(user.name);
          if (userIndex === -1) {
            // Add reaction
            message.reactions[emoji].push(user.name);
          } else {
            // Remove reaction
            message.reactions[emoji].splice(userIndex, 1);
            // Remove emoji if no users reacted with it
            if (message.reactions[emoji].length === 0) {
              delete message.reactions[emoji];
            }
          }
          
          // Clean up empty reactions object
          if (Object.keys(message.reactions).length === 0) {
            delete message.reactions;
          }
          
          // Save messages
          await saveChatMessages();
          
          // Broadcast reaction update to all clients
          io.emit('reactionUpdate', {
            messageId: messageId,
            reactions: message.reactions || {}
          });
          
          console.log('Reaction updated for message:', messageId, 'reactions:', message.reactions);
        } catch (error) {
          console.error('Error handling reaction:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${user.name} (${user._id})`);
      });
    } catch (error) {
      console.error('Socket connection error:', error);
      socket.emit('auth_error', { message: 'Authentication failed. Please try logging in again.' });
      socket.disconnect(true);
    }
  });
};
