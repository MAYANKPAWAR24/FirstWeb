import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import portfolioApi from './api/portfolio.js';
import { prerenderHtml } from './scripts/prerender';

/**
 * Dev-only API middleware.
 *
 * Mounts the real `api/portfolio.js` handler on `/api/portfolio` in
 * `vite dev`, adapting Node's req/res to the Vercel-style `res.status().json()`
 * interface. There is deliberately no `server.proxy`: running the actual
 * handler means dev exercises the same validation, auth and JSONBin code path
 * as production, so a bug cannot hide until deploy.
 */
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
              if (rawBody.length > 5_000_000) {
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

/**
 * Injects crawlable content into the built HTML.
 *
 * The site is a client-rendered SPA, so without this any tool that does not
 * execute JavaScript reads an empty page: no words, no headings, no links.
 * Runs after the HTML plugin has produced `index.html` and writes the snapshot
 * inside `#root`, which React then replaces on mount.
 */
function prerenderPlugin(): Plugin {
  return {
    name: 'portfolio-prerender',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return prerenderHtml(html);
      },
    },
  };
}

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Reads dotenv files WITHOUT variable expansion.
 *
 * Vite's `loadEnv` uses dotenv, which expands `$NAME` into a variable
 * reference. A JSONBin master key in bcrypt format contains four such
 * sequences (`$2a$10$…`), so expansion truncates it to the fragment after the
 * last `$` and every authenticated request fails with a 401 from JSONBin —
 * surfaced as a confusing 502 by our own error handler.
 *
 * Single-quoting the value does not help; dotenv expands inside quotes too.
 * Nothing in this project needs expansion, so it is simply not done.
 *
 * Production is unaffected: Vercel injects real environment variables, so
 * `process.env` is populated directly and no dotenv parsing happens at all.
 */
function readEnvFileRaw(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const result: Record<string, string> = {};
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    // Strip one layer of matching surrounding quotes, but leave `$` alone.
    if ((value.startsWith('"') && value.endsWith('"') && value.length > 1)
      || (value.startsWith("'") && value.endsWith("'") && value.length > 1)) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export default defineConfig(({ mode, command }) => {
  // Unprefixed: every secret stays server-side. Nothing in `src/` reads
  // `import.meta.env`.
  Object.assign(
    process.env,
    readEnvFileRaw(resolve(process.cwd(), '.env')),
    readEnvFileRaw(resolve(process.cwd(), `.env.${mode}`)),
    readEnvFileRaw(resolve(process.cwd(), '.env.local')),
    readEnvFileRaw(resolve(process.cwd(), `.env.${mode}.local`)),
  );

  return {
    plugins: [
      react(),
      prerenderPlugin(),
      ...(command === 'serve' ? [portfolioApiPlugin()] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          // The previous build emitted a single 332 KB entry chunk. Splitting
          // the framework out means a content-only edit does not invalidate
          // the vendor cache, and React can be parsed while the app chunk
          // streams.
          manualChunks: {
            react: ['react', 'react-dom'],
            gsap: ['gsap'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
