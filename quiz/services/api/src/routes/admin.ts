import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// ============ METRICS ============

router.get('/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();

    // Get attempt statistics
    const { data: attempts } = await supabase
      .from('attempts')
      .select('status, score_percent, pass, started_at')
      .gte('started_at', fromDate.toISOString())
      .lte('started_at', toDate.toISOString());

    const totalAttempts = attempts?.length || 0;
    const submitted = attempts?.filter(a => a.status === 'submitted') || [];
    const passed = submitted.filter(a => a.pass);
    const avgScore = submitted.length > 0
      ? submitted.reduce((sum, a) => sum + (a.score_percent || 0), 0) / submitted.length
      : 0;

    // Get quiz count
    const { count: quizCount } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });

    // Get user count
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    res.json({
      period: { from: fromDate, to: toDate },
      metrics: {
        totalAttempts,
        submittedAttempts: submitted.length,
        passedAttempts: passed.length,
        passRate: submitted.length > 0 ? (passed.length / submitted.length) * 100 : 0,
        averageScore: avgScore,
        activeQuizzes: quizCount || 0,
        totalUsers: userCount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// ============ ATTEMPTS ============

router.get('/attempts', async (req: AuthRequest, res: Response) => {
  try {
    const { status, quizId, userId, from, to, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = supabase
      .from('attempts')
      .select(`
        *,
        profiles!attempts_user_id_fkey(name, email),
        quizzes(title)
      `, { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1);

    if (status) query = query.eq('status', status);
    if (quizId) query = query.eq('quiz_id', quizId);
    if (userId) query = query.eq('user_id', userId);
    if (from) query = query.gte('started_at', from);
    if (to) query = query.lte('started_at', to);

    const { data: attempts, count, error } = await query;

    if (error) throw error;

    res.json({
      attempts: attempts?.map(a => ({
        id: a.id,
        quizId: a.quiz_id,
        quizTitle: a.quizzes?.title,
        userId: a.user_id,
        userName: a.profiles?.name,
        userEmail: a.profiles?.email,
        attemptNo: a.attempt_no,
        status: a.status,
        startedAt: a.started_at,
        endedAt: a.ended_at,
        scorePercent: a.score_percent,
        pass: a.pass,
        restartCount: a.restart_count,
        totalQuestions: a.total_questions,
        timeLimitSec: a.time_limit_sec,
        ip: a.ip,
        deviceInfo: a.device_info
      })),
      total: count,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
  } catch (error) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

router.get('/attempts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select(`
        *,
        profiles!attempts_user_id_fkey(name, email),
        quizzes(title, passing_percent)
      `)
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    // Get answers with questions
    const { data: answers } = await supabase
      .from('attempt_answers')
      .select(`
        *,
        questions(prompt, options, correct, explanation)
      `)
      .eq('attempt_id', id);

    // Get events
    const { data: events } = await supabase
      .from('attempt_events')
      .select('*')
      .eq('attempt_id', id)
      .order('event_at', { ascending: true });

    // Calculate correct answers count
    const correctCount = answers?.filter(a => {
      const selected = (a.selected as number[]).sort();
      const correct = (a.questions?.correct as number[] || []).sort();
      return JSON.stringify(selected) === JSON.stringify(correct);
    }).length || 0;

    res.json({
      attempt: {
        id: attempt.id,
        quizId: attempt.quiz_id,
        quizTitle: attempt.quizzes?.title,
        userId: attempt.user_id,
        userName: attempt.profiles?.name,
        userEmail: attempt.profiles?.email,
        attemptNo: attempt.attempt_no,
        status: attempt.status,
        startedAt: attempt.started_at,
        endedAt: attempt.ended_at,
        timeLimitSec: attempt.time_limit_sec,
        totalQuestions: attempt.total_questions,
        correctAnswers: correctCount,
        scorePercent: attempt.score_percent,
        pass: attempt.pass,
        passingPercent: attempt.quizzes?.passing_percent,
        restartCount: attempt.restart_count,
        restartReasonLast: attempt.restart_reason_last,
        deviceInfo: attempt.device_info,
        ip: attempt.ip,
        userAgent: attempt.user_agent
      },
      answers: answers?.map(a => ({
        questionId: a.question_id,
        prompt: a.questions?.prompt,
        options: a.questions?.options,
        selected: a.selected,
        correct: a.questions?.correct,
        explanation: a.questions?.explanation,
        timeSpentMs: a.time_spent_ms
      })),
      events
    });
  } catch (error) {
    console.error('Error fetching attempt details:', error);
    res.status(500).json({ error: 'Failed to fetch attempt details' });
  }
});

// ============ QUIZZES ============

router.get('/quizzes', async (req: AuthRequest, res: Response) => {
  try {
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
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

    res.json({
      quizzes: quizzes?.map(q => ({
        ...q,
        questionCount: countMap.get(q.id) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

router.post('/quizzes', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, passingPercent, timePerQuestionSec, bufferSec, isActive } = req.body;

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        title,
        description,
        passing_percent: passingPercent || 40,
        time_per_question_sec: timePerQuestionSec || 60,
        buffer_sec: bufferSec || 120,
        is_active: isActive || false,
        created_by: req.user!.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ quiz });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

router.put('/quizzes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, passingPercent, timePerQuestionSec, bufferSec, isActive } = req.body;

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .update({
        title,
        description,
        passing_percent: passingPercent,
        time_per_question_sec: timePerQuestionSec,
        buffer_sec: bufferSec,
        is_active: isActive
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ quiz });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

router.delete('/quizzes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// ============ QUESTIONS ============

router.get('/quizzes/:quizId/questions', async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;

    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

router.post('/quizzes/:quizId/questions', async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { qtype, prompt, options, correct, explanation, tags } = req.body;

    const { data: question, error } = await supabase
      .from('questions')
      .insert({
        quiz_id: quizId,
        qtype,
        prompt,
        options,
        correct,
        explanation,
        tags,
        created_by: req.user!.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ question });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

router.put('/questions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { qtype, prompt, options, correct, explanation, tags } = req.body;

    const { data: question, error } = await supabase
      .from('questions')
      .update({ qtype, prompt, options, correct, explanation, tags })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ question });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.delete('/questions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ============ IMPORTS ============

router.post('/imports/create', async (req: AuthRequest, res: Response) => {
  try {
    const { quizId, fileType } = req.body;

    if (!['csv', 'pdf'].includes(fileType)) {
      res.status(400).json({ error: 'Invalid file type' });
      return;
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('imports')
      .insert({
        quiz_id: quizId || null,
        uploaded_by: req.user!.id,
        file_path: '', // Will be updated after upload
        file_type: fileType
      })
      .select()
      .single();

    if (importError) throw importError;

    // Generate signed upload URL
    const filePath = `${req.user!.id}/${importRecord.id}/source.${fileType}`;
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('quiz-imports')
      .createSignedUploadUrl(filePath);

    if (urlError) throw urlError;

    // Update import with file path
    await supabase
      .from('imports')
      .update({ file_path: filePath })
      .eq('id', importRecord.id);

    res.json({
      importId: importRecord.id,
      signedUploadUrl: signedUrl.signedUrl,
      token: signedUrl.token,
      path: filePath
    });
  } catch (error) {
    console.error('Error creating import:', error);
    res.status(500).json({ error: 'Failed to create import' });
  }
});

router.post('/imports/:id/process', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Update status to processing
    await supabase
      .from('imports')
      .update({ status: 'processing' })
      .eq('id', id);

    // Call AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai:8000';
    const response = await fetch(`${aiServiceUrl}/ai/imports/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importId: id })
    });

    if (!response.ok) {
      throw new Error('AI service failed to process import');
    }

    const result = await response.json() as Record<string, unknown>;

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error processing import:', error);

    // Update status to failed
    await supabase
      .from('imports')
      .update({
        status: 'failed',
        result_summary: { error: (error as Error).message }
      })
      .eq('id', req.params.id);

    res.status(500).json({ error: 'Failed to process import' });
  }
});

router.get('/imports', async (req: AuthRequest, res: Response) => {
  try {
    const { data: imports, error } = await supabase
      .from('imports')
      .select(`
        *,
        quizzes(title),
        profiles!imports_uploaded_by_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ imports });
  } catch (error) {
    console.error('Error fetching imports:', error);
    res.status(500).json({ error: 'Failed to fetch imports' });
  }
});

// ============ EXPORT ============

router.get('/quizzes/:id/export.csv', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', id);

    if (error) throw error;

    // Generate CSV
    const headers = ['prompt', 'qtype', 'options', 'correct', 'explanation', 'tags'];
    const rows = questions?.map(q => [
      `"${q.prompt.replace(/"/g, '""')}"`,
      q.qtype,
      `"${JSON.stringify(q.options).replace(/"/g, '""')}"`,
      `"${JSON.stringify(q.correct)}"`,
      q.explanation ? `"${q.explanation.replace(/"/g, '""')}"` : '',
      q.tags ? `"${q.tags.join(',')}"` : ''
    ]);

    const csv = [headers.join(','), ...(rows?.map(r => r.join(',')) || [])].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=quiz-${id}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting quiz:', error);
    res.status(500).json({ error: 'Failed to export quiz' });
  }
});

// ============ USERS ============

router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ users: profiles });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users/:id/make-admin', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: id, role: 'admin' });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error making user admin:', error);
    res.status(500).json({ error: 'Failed to make user admin' });
  }
});

export { router as adminRouter };
