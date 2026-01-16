import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { calculateScore, isPassing } from '../lib/scoring.js';
import { seededShuffle, generateShuffleSeed } from '../lib/shuffle.js';
import { sendQuizResultEmail } from '../lib/email.js';

const router = Router();

// Start a new attempt
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { quizId, deviceInfo } = req.body;
    const userId = req.user!.id;

    // Get quiz and questions
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('is_active', true)
      .single();

    if (quizError || !quiz) {
      res.status(404).json({ error: 'Quiz not found or not active' });
      return;
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', quizId);

    if (questionsError) throw questionsError;

    const totalQuestions = questions?.length || 0;
    if (totalQuestions === 0) {
      res.status(400).json({ error: 'Quiz has no questions' });
      return;
    }

    const timeLimitSec = totalQuestions * quiz.time_per_question_sec + quiz.buffer_sec;
    const shuffleSeed = generateShuffleSeed();
    const questionIds = questions!.map(q => q.id);
    const shuffledOrder = seededShuffle(questionIds, shuffleSeed);

    // Create attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        quiz_id: quizId,
        user_id: userId,
        total_questions: totalQuestions,
        time_limit_sec: timeLimitSec,
        shuffle_seed: shuffleSeed,
        device_info: deviceInfo,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    res.json({
      attemptId: attempt.id,
      attemptNo: attempt.attempt_no,
      timeLimitSec,
      questionOrder: shuffledOrder,
      shuffleSeed,
      startedAt: attempt.started_at
    });
  } catch (error) {
    console.error('Error starting attempt:', error);
    res.status(500).json({ error: 'Failed to start attempt' });
  }
});

// Restart attempt (create new one, mark old as abandoned)
router.post('/restart', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, reason } = req.body;
    const userId = req.user!.id;

    // Get current attempt
    const { data: oldAttempt, error: fetchError } = await supabase
      .from('attempts')
      .select('*, quizzes(*)')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !oldAttempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (oldAttempt.status !== 'in_progress') {
      res.status(400).json({ error: 'Attempt is not in progress' });
      return;
    }

    // Mark old attempt as abandoned
    await supabase
      .from('attempts')
      .update({
        status: 'abandoned',
        ended_at: new Date().toISOString(),
        restart_reason_last: reason
      })
      .eq('id', attemptId);

    // Log restart event
    await supabase.from('attempt_events').insert({
      attempt_id: attemptId,
      user_id: userId,
      event_type: 'restart',
      payload: { reason, previous_attempt_id: attemptId }
    });

    // Create new attempt
    const quiz = oldAttempt.quizzes;
    const shuffleSeed = generateShuffleSeed();

    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', oldAttempt.quiz_id);

    const questionIds = questions!.map(q => q.id);
    const shuffledOrder = seededShuffle(questionIds, shuffleSeed);

    const { data: newAttempt, error: createError } = await supabase
      .from('attempts')
      .insert({
        quiz_id: oldAttempt.quiz_id,
        user_id: userId,
        total_questions: oldAttempt.total_questions,
        time_limit_sec: oldAttempt.time_limit_sec,
        shuffle_seed: shuffleSeed,
        restart_count: oldAttempt.restart_count + 1,
        device_info: oldAttempt.device_info,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      })
      .select()
      .single();

    if (createError) throw createError;

    res.json({
      attemptId: newAttempt.id,
      attemptNo: newAttempt.attempt_no,
      timeLimitSec: newAttempt.time_limit_sec,
      questionOrder: shuffledOrder,
      shuffleSeed,
      startedAt: newAttempt.started_at,
      restartCount: newAttempt.restart_count
    });
  } catch (error) {
    console.error('Error restarting attempt:', error);
    res.status(500).json({ error: 'Failed to restart attempt' });
  }
});

// Submit attempt
router.post('/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.body;
    const userId = req.user!.id;

    // Get attempt with quiz
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*, quizzes(*)')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (attemptError || !attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.status !== 'in_progress') {
      res.status(400).json({ error: 'Attempt already submitted or abandoned' });
      return;
    }

    // Get questions and answers
    const { data: questions } = await supabase
      .from('questions')
      .select('id, qtype, correct')
      .eq('quiz_id', attempt.quiz_id);

    const { data: answers } = await supabase
      .from('attempt_answers')
      .select('question_id, selected')
      .eq('attempt_id', attemptId);

    // Calculate score
    const scoreResult = calculateScore(
      questions || [],
      answers?.map(a => ({
        question_id: a.question_id,
        selected: a.selected as number[]
      })) || []
    );

    const pass = isPassing(scoreResult.score, attempt.quizzes.passing_percent);

    // Update attempt
    const { error: updateError } = await supabase
      .from('attempts')
      .update({
        status: 'submitted',
        ended_at: new Date().toISOString(),
        score_percent: scoreResult.score,
        pass
      })
      .eq('id', attemptId);

    if (updateError) throw updateError;

    // Log submit event
    await supabase.from('attempt_events').insert({
      attempt_id: attemptId,
      user_id: userId,
      event_type: 'submit',
      payload: {
        score: scoreResult.score,
        correct: scoreResult.totalCorrect,
        total: scoreResult.totalQuestions,
        pass
      }
    });

    // Send result emails with comprehensive data
    try {
      await sendQuizResultEmail({
        userEmail: req.user!.email,
        userName: req.user!.name || 'User',
        quizTitle: attempt.quizzes.title,
        score: scoreResult.score,
        passed: pass,
        totalQuestions: scoreResult.totalQuestions,
        correctAnswers: scoreResult.totalCorrect,
        passingPercent: attempt.quizzes.passing_percent,
        attemptNo: attempt.attempt_no,
        restartCount: attempt.restart_count,
        startedAt: attempt.started_at,
        endedAt: new Date().toISOString(),
        timeLimitSec: attempt.time_limit_sec,
        deviceInfo: attempt.device_info,
        ip: attempt.ip,
        userAgent: attempt.user_agent
      });
    } catch (emailError) {
      console.error('Failed to send result email:', emailError);
    }

    res.json({
      score: scoreResult.score,
      totalCorrect: scoreResult.totalCorrect,
      totalQuestions: scoreResult.totalQuestions,
      pass,
      passingPercent: attempt.quizzes.passing_percent
    });
  } catch (error) {
    console.error('Error submitting attempt:', error);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
});

// Get attempt status (for resuming)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { data: attempt, error } = await supabase
      .from('attempts')
      .select('*, quizzes(title, passing_percent)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    // Get answers if in progress
    let answers: Array<{ question_id: string; selected: number[] }> = [];
    if (attempt.status === 'in_progress') {
      const { data } = await supabase
        .from('attempt_answers')
        .select('question_id, selected')
        .eq('attempt_id', id);
      answers = data?.map(a => ({
        question_id: a.question_id,
        selected: a.selected as number[]
      })) || [];
    }

    res.json({
      attempt: {
        id: attempt.id,
        quizId: attempt.quiz_id,
        quizTitle: attempt.quizzes.title,
        status: attempt.status,
        startedAt: attempt.started_at,
        endedAt: attempt.ended_at,
        timeLimitSec: attempt.time_limit_sec,
        shuffleSeed: attempt.shuffle_seed,
        scorePercent: attempt.score_percent,
        pass: attempt.pass,
        passingPercent: attempt.quizzes.passing_percent
      },
      answers
    });
  } catch (error) {
    console.error('Error fetching attempt:', error);
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
});

export { router as attemptsRouter };
