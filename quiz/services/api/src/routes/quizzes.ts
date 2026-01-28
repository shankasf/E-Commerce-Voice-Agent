import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get active quizzes for users
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, title, description, passing_percent, time_per_question_sec, buffer_sec')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get question counts
    const quizIds = quizzes?.map(q => q.id) || [];
    const { data: counts } = await supabase
      .from('questions')
      .select('quiz_id')
      .in('quiz_id', quizIds);

    const countMap = new Map<string, number>();
    counts?.forEach(c => {
      countMap.set(c.quiz_id, (countMap.get(c.quiz_id) || 0) + 1);
    });

    const result = quizzes?.map(q => ({
      ...q,
      question_count: countMap.get(q.id) || 0,
      time_limit_sec: (countMap.get(q.id) || 0) * q.time_per_question_sec + q.buffer_sec
    }));

    res.json({ quizzes: result });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get quiz details with questions (for taking quiz)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (quizError || !quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, qtype, prompt, options')
      .eq('quiz_id', id);

    if (questionsError) throw questionsError;

    res.json({
      quiz: {
        ...quiz,
        question_count: questions?.length || 0,
        time_limit_sec: (questions?.length || 0) * quiz.time_per_question_sec + quiz.buffer_sec
      },
      questions: questions?.map(q => ({
        id: q.id,
        qtype: q.qtype,
        prompt: q.prompt,
        options: q.options
      }))
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

export { router as quizzesRouter };
