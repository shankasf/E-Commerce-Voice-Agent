import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { attemptsRouter } from './routes/attempts.js';
import { eventsRouter } from './routes/events.js';
import { answersRouter } from './routes/answers.js';
import { adminRouter } from './routes/admin.js';
import { quizzesRouter } from './routes/quizzes.js';
import { errorHandler } from './middleware/error.js';
import { authMiddleware, AuthRequest } from './middleware/auth.js';
import { supabase } from './lib/supabase.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://quiz.callsphere.tech', 'https://quiz.callsphere.tech/admin']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check admin status (uses service role to bypass RLS)
app.get('/api/auth/check-admin', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.json({ isAdmin: false });
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authReq.user.id)
      .eq('role', 'admin')
      .single();

    res.json({ isAdmin: !error && !!data });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.json({ isAdmin: false });
  }
});

// User routes
app.use('/api/attempts', attemptsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/answers', answersRouter);
app.use('/api/quizzes', quizzesRouter);

// Admin routes
app.use('/api/admin', adminRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Quiz API server running on port ${PORT}`);
});

export default app;
