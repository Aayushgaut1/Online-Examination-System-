import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import authRoutes from './server/routes/authRoutes.js';
import examRoutes from './server/routes/examRoutes.js';
import questionRoutes from './server/routes/questionRoutes.js';
import attemptRoutes from './server/routes/attemptRoutes.js';
import resultRoutes from './server/routes/resultRoutes.js';
import studentRoutes from './server/routes/studentRoutes.js';
import dashboardRoutes from './server/routes/dashboardRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database (Connects to MySQL or activates disk-backed ACID engine)
  await db.init();

  // Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger for API routes
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      system: 'NexusExam Online Examination System',
      timestamp: new Date().toISOString(),
      database: db.isUsingMySQL ? 'MySQL' : 'Persistent Relational Engine'
    });
  });

  // Mount API Sub-Routers
  app.use('/api/auth', authRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api', questionRoutes);
  app.use('/api', attemptRoutes);
  app.use('/api/results', resultRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Global API 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Unknown error' });
  });

  // Vite middleware setup (Development vs Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 NexusExam Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Storage Mode: ${db.isUsingMySQL ? 'MySQL Connection Pool' : 'Built-in Persistent Relational Engine'}`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start NexusExam server:', err);
  process.exit(1);
});
