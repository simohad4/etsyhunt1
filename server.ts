import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  ANALYSIS_UNAVAILABLE_MESSAGE,
  AccessTokenVerifier,
  createSupabaseAccessTokenVerifier,
  extractBearerToken
} from './src/server/m1Security';
import {
  AdminAuthorizationStore,
  createSupabaseAdminAuthorizationStore,
  registerAdminRoutes
} from './src/server/adminRbac';

dotenv.config();

function resolvePort(): number {
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

  if (process.env.DEFAULT_APP_PORT) {
    const val = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(val)) return val;
  }
  if (process.env.APP_PORT) {
    const val = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(val)) return val;
  }

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

interface CreateApiAppOptions {
  verifyAccessToken?: AccessTokenVerifier;
  adminStore?: AdminAuthorizationStore | null;
}

export function createApiApp(options: CreateApiAppOptions = {}) {
  const app = express();
  const verifyAccessToken = options.verifyAccessToken ?? createSupabaseAccessTokenVerifier();
  const adminStore =
    options.adminStore === undefined
      ? createSupabaseAdminAuthorizationStore()
      : options.adminStore;

  app.use(express.json({ limit: '10mb' }));

  // Health check & status
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'online',
      name: 'Etsy Hunter API',
      version: '1.0.0-m1',
      timestamp: new Date().toISOString()
    });
  });

  registerAdminRoutes(app, { verifyAccessToken, adminStore });

  // M1: Authenticate the caller, then fail closed before any paid provider or credit operation.
  app.post('/api/analyze-etsy', async (req, res) => {
    const accessToken = extractBearerToken(req.get('authorization'));
    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const verifiedUser = await verifyAccessToken(accessToken).catch(() => null);
    if (!verifiedUser) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    return res.status(503).json({ error: ANALYSIS_UNAVAILABLE_MESSAGE });
  });

  return app;
}

export async function startServer() {
  const app = createApiApp();
  const port = resolvePort();
  const host = resolveHost();
  const isProduction = process.env.NODE_ENV === 'production';

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
    console.log(`[Etsy Hunter] Full-Stack server live on http://${host}:${port}`);
  });

  const shutdown = () => {
    console.log('[Etsy Hunter] Shutting down server...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

const isDirectRun = Boolean(
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

if (isDirectRun) {
  startServer().catch((err) => {
    console.error('Fatal server boot error:', err);
    process.exit(1);
  });
}
