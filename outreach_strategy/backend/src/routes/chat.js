import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { getChatResponse } from '../services/openai.js';

const router = Router();
const prisma = new PrismaClient();

// Send a message and get AI response
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get recent chat history for context
    const recentMessages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Format chat history for OpenAI
    const chatHistory = recentMessages.reverse().flatMap(msg => [
      { role: 'user', content: msg.message },
      { role: 'assistant', content: msg.response }
    ]);

    // Get AI response
    const response = await getChatResponse(message, chatHistory);

    // Save the message and response
    const chatMessage = await prisma.chatMessage.create({
      data: {
        userId,
        message,
        response,
      },
    });

    res.json({
      id: chatMessage.id,
      message: chatMessage.message,
      response: chatMessage.response,
      createdAt: chatMessage.createdAt,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get chat history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Clear chat history
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.chatMessage.deleteMany({
      where: { userId },
    });

    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;
