import { Router, Request, Response } from 'express';
import { chat, streamChat, clearSession } from '../services/llm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /chat - Non-streaming chat
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const sid = sessionId || uuidv4();
    const result = await chat(message, sid);

    return res.json({
      reply: result.reply,
      toolsUsed: result.toolsUsed,
      sessionId: result.sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /chat/stream - SSE streaming chat
router.post('/stream', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const sid = sessionId || uuidv4();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Send session ID first
  sendEvent('session', { sessionId: sid });

  try {
    await streamChat(
      message,
      sid,
      (token) => sendEvent('token', { token }),
      (toolName) => sendEvent('tool', { toolName }),
      (toolsUsed) => {
        sendEvent('complete', { toolsUsed, sessionId: sid });
        res.end();
      }
    );
  } catch (error) {
    console.error('Stream error:', error);
    sendEvent('error', { message: 'Stream failed', error: String(error) });
    res.end();
  }
});

// DELETE /chat/:sessionId - Clear session
router.delete('/:sessionId', (req: Request, res: Response) => {
  clearSession(req.params.sessionId);
  return res.json({ success: true, message: 'Session cleared' });
});

export default router;
