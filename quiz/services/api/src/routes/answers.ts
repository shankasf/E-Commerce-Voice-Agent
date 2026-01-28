import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Upsert answer
router.post('/upsert', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, questionId, selected, timeSpentMs } = req.body;
    const userId = req.user!.id;

    if (!attemptId || !questionId || !Array.isArray(selected)) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    // Verify attempt belongs to user and is in progress
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id, status')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (attemptError || !attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.status !== 'in_progress') {
      res.status(400).json({ error: 'Attempt is not in progress' });
      return;
    }

    // Upsert answer
    const { error: upsertError } = await supabase
      .from('attempt_answers')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        selected,
        time_spent_ms: timeSpentMs,
        changed_at: new Date().toISOString()
      }, {
        onConflict: 'attempt_id,question_id'
      });

    if (upsertError) throw upsertError;

    // Log answer change event
    await supabase.from('attempt_events').insert({
      attempt_id: attemptId,
      user_id: userId,
      event_type: 'answer_change',
      payload: { questionId, selected }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving answer:', error);
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

export { router as answersRouter };
