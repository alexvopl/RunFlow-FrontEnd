import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function devErrorLogger(): Plugin {
  return {
    name: 'dev-error-logger',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/log-error', (req, res) => {
        if (req.method !== 'POST') { res.end(); return; }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { message, stack, componentStack } = JSON.parse(body) as {
              message: string;
              stack?: string;
              componentStack?: string;
            };

            const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
            const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
            const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

            const lines: string[] = [
              '',
              bold(red('  [watch] React render error')),
              red(`  ${message}`),
            ];

            if (stack) {
              const frames = stack.split('\n').slice(1, 5);
              frames.forEach(f => lines.push(dim(`  ${f.trim()}`)));
            }

            if (componentStack) {
              lines.push(dim('  Component tree:'));
              componentStack.split('\n').slice(1, 6).forEach(f => {
                lines.push(dim(`    ${f.trim()}`));
              });
            }

            lines.push('');
            console.error(lines.join('\n'));
          } catch {
            // malformed body, ignore
          }

          res.writeHead(204);
          res.end();
        });
      });
    },
  };
}

function getDevPort(env: Record<string, string>) {
  if (env.VITE_DEV_PORT) {
    const parsed = Number.parseInt(env.VITE_DEV_PORT, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  if (env.FRONTEND_PORT) {
    const parsed = Number.parseInt(env.FRONTEND_PORT, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  if (env.VITE_APP_URL) {
    try {
      const parsed = new URL(env.VITE_APP_URL)
      if (parsed.port) {
        return Number.parseInt(parsed.port, 10)
      }
    } catch {
      return undefined
    }
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = getDevPort(env)

  return {
    plugins: [react(), devErrorLogger()],
    server: {
      host: true,
      port,
    },
  }
})
