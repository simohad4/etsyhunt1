import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { fetchApifyListings, analyzeEtsyMarket } from './src/services/analyzer';

dotenv.config();

function resolvePort(): number {
  // Check CLI arguments (--port 3000 or --port=3000)
  const portIndex = process.argv.indexOf('--port');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    const val = parseInt(process.argv[portIndex + 1], 10);
    if (!isNaN(val)) return val;
  }
  const portFlag = process.argv.find((arg) => arg.startsWith('--port='));
  if (portFlag) {
    const val = parseInt(portFlag.split('=')[1], 10);
    if (!isNaN(val)) return val;
  }

  // Check DEFAULT_APP_PORT or APP_PORT
  if (process.env.DEFAULT_APP_PORT) {
    const val = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(val)) return val;
  }
  if (process.env.APP_PORT) {
    const val = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(val)) return val;
  }

  // Use process.env.PORT only if it is not the external Nginx ingress port (8080)
  if (process.env.PORT && process.env.PORT !== '8080' && process.env.PORT !== process.env.NGINX_PORT) {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val)) return val;
  }

  return 3000;
}

function resolveHost(): string {
  const hostIndex = process.argv.indexOf('--host');
  if (hostIndex !== -1 && process.argv[hostIndex + 1]) {
    return process.argv[hostIndex + 1];
  }
  const hostFlag = process.argv.find((arg) => arg.startsWith('--host='));
  if (hostFlag) {
    return hostFlag.split('=')[1];
  }
  return '0.0.0.0';
}

async function startServer() {
  const app = express();
  const port = resolvePort();
  const host = resolveHost();
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Health check & status
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'online',
      name: 'Etsy Hunter AI Enterprise API',
      engineReady: true,
      timestamp: new Date().toISOString()
    });
  });

  // Main analyze endpoint
  app.post('/api/analyze-etsy', async (req, res) => {
    try {
      const { keyword, apifyToken } = req.body || {};

      if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
        return res.status(400).json({ error: 'Keyword is required and cannot be empty.' });
      }

      const cleanKeyword = keyword.trim();
      const headerToken = req.headers['x-apify-token'] as string | undefined;
      const effectiveToken = apifyToken || headerToken || process.env.APIFY_TOKEN;

      // 1. Fetch live listings or fallback data
      const { listings, isLive, error: scrapeNotice } = await fetchApifyListings(
        cleanKeyword,
        effectiveToken
      );

      if (!listings || listings.length === 0) {
        return res.status(404).json({ error: 'No listings found for this keyword.' });
      }

      // 2. Run Gemini Market Intelligence
      const analysis = await analyzeEtsyMarket(
        cleanKeyword,
        listings,
        isLive,
        scrapeNotice
      );

      return res.json(analysis);
    } catch (err: any) {
      console.error('[Etsy Hunter AI Server Error]:', err);
      const isConfigError = err.message?.includes('GEMINI_API_KEY');
      return res.status(isConfigError ? 500 : 502).json({
        error: err.message || 'Failed to complete market analysis.'
      });
    }
  });

  // Mount Vite or static server
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(port, host, () => {
    console.log(`[Etsy Hunter AI] Full-Stack server live on http://${host}:${port}`);
  });

  const shutdown = () => {
    console.log('[Etsy Hunter AI] Shutting down server...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
