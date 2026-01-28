import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

interface EventPayload {
  eventType: string;
  eventAt: string;
  payload?: Record<string, unknown>;
}

// Batch log events
router.post('/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, events } = req.body as {
      attemptId: string;
      events: EventPayload[];
    };
    const userId = req.user!.id;

    if (!attemptId || !events || !Array.isArray(events)) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    // Verify attempt belongs to user
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (attemptError || !attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    // Insert all events
    const eventRecords = events.map(e => ({
      attempt_id: attemptId,
      user_id: userId,
      event_type: e.eventType,
      event_at: e.eventAt || new Date().toISOString(),
      payload: e.payload || null
    }));

    const { error: insertError } = await supabase
      .from('attempt_events')
      .insert(eventRecords);

    if (insertError) throw insertError;

    res.json({ success: true, count: events.length });
  } catch (error) {
    console.error('Error logging events:', error);
    res.status(500).json({ error: 'Failed to log events' });
  }
});

export { router as eventsRouter };
