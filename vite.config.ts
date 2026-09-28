import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import portfolioApi from './api/portfolio.js';

function portfolioApiPlugin(): Plugin {
  return {
    name: 'portfolio-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/portfolio', (req, res, next) => {
        const run = async () => {
          let body;
          if (req.method === 'POST' || req.method === 'PUT') {
            let rawBody = '';
            for await (const chunk of req) {
              rawBody += chunk;
              if (rawBody.length > 1_000_000) {
                res.statusCode = 413;
                res.end(JSON.stringify({ error: 'Request body is too large' }));
                return;
              }
            }
            body = rawBody ? JSON.parse(rawBody) : {};
          }

          const apiRequest = { method: req.method, headers: req.headers, body };
          const apiResponse = {
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            status(code: number) { res.statusCode = code; return this; },
            json(value: unknown) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(value));
              return this;
            },
            end: () => res.end(),
          };
          await portfolioApi(apiRequest, apiResponse);
        };

        run().catch(next);
      });
    },
  };
}

export default defineConfig(({ mode, command }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), ...(command === 'serve' ? [portfolioApiPlugin()] : [])],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
