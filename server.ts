import express from 'express';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { postgresAdapter } from './server/postgresAdapter.js';
import authRoutes from './server/routes/authRoutes.js';
import examRoutes from './server/routes/examRoutes.js';
import questionRoutes from './server/routes/questionRoutes.js';
import attemptRoutes from './server/routes/attemptRoutes.js';
import resultRoutes from './server/routes/resultRoutes.js';
import studentRoutes from './server/routes/studentRoutes.js';
import dashboardRoutes from './server/routes/dashboardRoutes.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database (Connects to PostgreSQL/Supabase, MySQL, or activates disk-backed engine)
  await db.init();

  // Middlewares
  // Enable CORS for all origins, headers, methods and preflight requests
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

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
      database: postgresAdapter.isConnected
        ? `PostgreSQL (${postgresAdapter.connectionType})`
        : (db.isUsingMySQL ? 'MySQL' : 'Persistent Relational Engine')
    });
  });

  // Safe client configuration endpoint (Supabase public anon key only)
  app.get('/api/config', (req, res) => {
    res.json({
      supabaseUrl:
        process.env.VITE_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        'https://jwnhapdvdsvwbyumtjun.supabase.co',
      supabaseAnonKey:
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        '',
    });
  });

  // Mount API Sub-Routers
  app.use('/api/auth', authRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api', questionRoutes);
  app.use('/api', attemptRoutes);
  app.use('/api/results', resultRoutes);
  app.use('/api', resultRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api', dashboardRoutes);

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
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      try {
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8');
          const envConfig = {
            VITE_SUPABASE_URL:
              process.env.VITE_SUPABASE_URL ||
              process.env.SUPABASE_URL ||
              'https://jwnhapdvdsvwbyumtjun.supabase.co',
            VITE_SUPABASE_ANON_KEY:
              process.env.VITE_SUPABASE_ANON_KEY ||
              process.env.SUPABASE_ANON_KEY ||
              '',
          };
          const scriptTag = `<script>window.__ENV__ = ${JSON.stringify(envConfig)};</script>`;
          html = html.includes('</head>')
            ? html.replace('</head>', `${scriptTag}</head>`)
            : `${scriptTag}${html}`;
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        }
      } catch (err) {
        console.warn('[Server] Fallback serving index.html:', err);
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 NexusExam Server running on http://0.0.0.0:${PORT}`);
    console.log(
      `📊 Storage Mode: ${
        postgresAdapter.isConnected
          ? `PostgreSQL / Supabase (${postgresAdapter.connectionType})`
          : (db.isUsingMySQL ? 'MySQL Connection Pool' : 'Built-in Persistent Relational Engine')
      }`
    );
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start NexusExam server:', err);
  process.exit(1);
});

