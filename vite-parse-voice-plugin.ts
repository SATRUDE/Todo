/**
 * Vite plugin: handle /api/parse-voice-task in dev when proxy/vercel is unreliable.
 * Runs the parse-voice-task handler directly in Node.
 */
import type { Plugin } from 'vite';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = resolve(__dirname, '.env.local');
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    });
  } catch {}
}

export function parseVoiceApiPlugin(): Plugin {
  return {
    name: 'parse-voice-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/api/parse-voice-task') {
          return next();
        }
        const body = await new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          req.on('error', reject);
        });
        const mockReq = {
          method: 'POST',
          url: '/api/parse-voice-task',
          body: body ? (() => { try { return JSON.parse(body); } catch { return body; } })() : null,
        };
        const mockRes = {
          headersSent: false,
          _status: 200,
          _headers: {} as Record<string, string>,
          setHeader(k: string, v: string) {
            this._headers[k.toLowerCase()] = v;
          },
          status(code: number) {
            this._status = code;
            return this;
          },
          end(data?: string) {
            if (this.headersSent) return;
            this.headersSent = true;
            res.writeHead(this._status, { ...this._headers, 'Content-Type': 'application/json' });
            res.end(data || '{}');
          },
        };
        try {
          loadEnvLocal();
          const handler = require('./api/parse-voice-task.js');
          await handler(mockReq, mockRes);
          if (!mockRes.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No response', message: 'Handler did not respond' }));
          }
        } catch (e) {
          console.error('[parse-voice-api]', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server error', message: String(e instanceof Error ? e.message : e) }));
        }
      });
    },
  };
}
