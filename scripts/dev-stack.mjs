import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const frontendDir = process.cwd();
const backendDir = resolveBackendDir();
const backendApiDir = path.join(backendDir, 'apps', 'api');
const frontendFileEnv = loadEnvFile(frontendDir);
const frontendBaseEnv = {
  ...frontendFileEnv,
  ...process.env,
};

const frontendPort =
  process.env.FRONTEND_PORT ??
  frontendBaseEnv.VITE_DEV_PORT ??
  getPortFromUrl(frontendBaseEnv.VITE_APP_URL) ??
  '5173';
const backendPort = process.env.BACKEND_PORT ?? '3000';
const lanIp = process.env.RUNFLOW_HOST_IP ?? getLocalIp() ?? '127.0.0.1';

const frontendOrigin = `http://${lanIp}:${frontendPort}`;
const frontendPublicUrl = frontendBaseEnv.VITE_APP_URL ?? frontendOrigin;
const authRedirectUrl = frontendBaseEnv.VITE_AUTH_REDIRECT_URL ?? `${frontendPublicUrl}/auth/callback`;
const passwordResetUrl = frontendBaseEnv.VITE_PASSWORD_RESET_URL ?? `${frontendPublicUrl}/reset-password`;
const backendOrigin = `http://${lanIp}:${backendPort}`;
const backendApiUrl = `${backendOrigin}/api`;
const localFrontendUrl = `http://localhost:${frontendPort}`;
const localBackendApiUrl = `http://localhost:${backendPort}/api`;

const backendEnvPath = resolveBackendEnvPath();
const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(backendDir)) {
  fail(`Backend directory not found: ${backendDir}`);
}

if (!fs.existsSync(backendApiDir)) {
  fail(`Backend API directory not found: ${backendApiDir}`);
}

if (!backendEnvPath) {
  fail(
    [
      'No backend env file found.',
      'Expected:',
      `- ${path.join(backendApiDir, '.env.local')}`,
      '',
      'This repo now standardizes on apps/api/.env.local only.',
      'Set RUNFLOW_BACKEND_ENV_FILE to override this.',
    ].join('\n')
  );
}

const backendEnv = {
  ...process.env,
  DOTENV_PATH: backendEnvPath,
  PORT: backendPort,
  FRONTEND_URL: frontendPublicUrl,
  AUTH_REDIRECT_URL_DEFAULT: authRedirectUrl,
  PASSWORD_RESET_URL_DEFAULT: passwordResetUrl,
  API_URL: backendOrigin,
  STRAVA_REDIRECT_URI: `${frontendPublicUrl.replace(/\/+$/, '')}/strava/callback`,
  ALLOWED_ORIGINS: mergeOrigins(frontendBaseEnv.ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGINS, frontendOrigin),
};

const frontendEnv = {
  ...frontendFileEnv,
  ...process.env,
  VITE_API_URL: frontendBaseEnv.VITE_API_URL ?? backendApiUrl,
  VITE_APP_URL: frontendPublicUrl,
  VITE_AUTH_REDIRECT_URL: authRedirectUrl,
  VITE_PASSWORD_RESET_URL: passwordResetUrl,
  VITE_DEV_PORT: frontendBaseEnv.VITE_DEV_PORT ?? frontendPort,
  VITE_DEV_HOST: lanIp,
  NO_COLOR: '1',
  FORCE_COLOR: '0',
};

backendEnv.NO_COLOR = '1';
backendEnv.FORCE_COLOR = '0';

if (dryRun) {
  printPlan();
  process.exit(0);
}

ensureDependencies(frontendDir, 'node_modules', 'npm', ['install'], 'frontend');
ensureDependencies(backendDir, 'node_modules', 'pnpm', ['install'], 'backend');
printPlan();

const children = [];

const backend = spawn('pnpm', ['dev'], {
  cwd: backendApiDir,
  env: backendEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
children.push(backend);
pipeOutput(backend, 'backend');

const frontend = spawn('npm', ['run', 'dev', '--', '--port', frontendPort, '--clearScreen', 'false'], {
  cwd: frontendDir,
  env: frontendEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
children.push(frontend);
pipeOutput(frontend, 'frontend');

let shuttingDown = false;

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const sibling of children) {
      if (sibling.pid && sibling !== child) {
        sibling.kill('SIGTERM');
      }
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    for (const child of children) {
      if (child.pid) {
        child.kill('SIGTERM');
      }
    }
  });
}

function getLocalIp() {
  const networks = os.networkInterfaces();

  for (const entries of Object.values(networks)) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) {
        continue;
      }

      if (
        entry.address.startsWith('192.168.') ||
        entry.address.startsWith('10.') ||
        entry.address.startsWith('172.')
      ) {
        return entry.address;
      }
    }
  }

  return null;
}

function getPortFromUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.port || null;
  } catch {
    return null;
  }
}

function loadEnvFile(baseDir) {
  const candidates = [
    path.join(baseDir, '.env.local'),
    path.join(baseDir, '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return parseEnvFile(candidate);
    }
  }

  return {};
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function resolveBackendEnvPath() {
  const explicit = process.env.RUNFLOW_BACKEND_ENV_FILE;
  const candidates = [
    explicit ? path.resolve(explicit) : null,
    path.join(backendApiDir, '.env.local'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveBackendDir() {
  if (process.env.RUNFLOW_BACKEND_DIR) {
    return path.resolve(process.env.RUNFLOW_BACKEND_DIR);
  }

  const candidates = [
    path.resolve(frontendDir, '..', 'RunFlow_pro_backend'),
    path.resolve(frontendDir, '..', '..', 'RunFlow_pro_backend'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function mergeOrigins(existingOrigins, requiredOrigin) {
  const origins = new Set([
    `http://localhost:${frontendPort}`,
    `http://127.0.0.1:${frontendPort}`,
    requiredOrigin,
  ]);

  for (const origin of (existingOrigins ?? '').split(',')) {
    const value = origin.trim();
    if (value) {
      origins.add(value);
    }
  }

  return Array.from(origins).join(',');
}

function printPlan() {
  console.log('');
  console.log('RunFlow local stack');
  console.log(`- backend dir: ${backendDir}`);
  console.log(`- backend env: ${backendEnvPath}`);
  console.log(`- backend api local: ${localBackendApiUrl}`);
  console.log(`- backend api network: ${backendApiUrl}`);
  console.log(`- frontend local: ${localFrontendUrl}`);
  console.log(`- frontend public: ${frontendPublicUrl}`);
  console.log(`- phone url: ${frontendOrigin}`);
  console.log('');
  console.log('Open on phone:');
  console.log(`  ${frontendOrigin}`);
  console.log('');
  console.log('Useful local URLs:');
  console.log(`  frontend local:  ${localFrontendUrl}`);
  console.log(`  backend local:   ${localBackendApiUrl}`);
  console.log(`  backend network: ${backendApiUrl}`);
  console.log(`  docs local:      http://localhost:${backendPort}/docs`);
  console.log('');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureDependencies(baseDir, folderName, command, args, label) {
  if (process.env.RUNFLOW_SKIP_INSTALL === '1') {
    return;
  }

  const dependencyDir = path.join(baseDir, folderName);
  if (fs.existsSync(dependencyDir)) {
    return;
  }

  console.log(`${label}: missing ${folderName}, running ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd: baseDir,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    fail(`${label}: failed to install dependencies`);
  }
}

function pipeOutput(child, label) {
  const prefix = `[${label}]`;
  attachStream(child.stdout, prefix);
  attachStream(child.stderr, prefix);
}

function attachStream(stream, prefix) {
  if (!stream) {
    return;
  }

  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += stripTerminalControl(chunk.toString('utf8'));
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.replace(/\r/g, '').trimEnd();
      if (trimmed) {
        process.stdout.write(`${prefix} ${trimmed}\n`);
      }
    }
  });

  stream.on('end', () => {
    const trimmed = buffer.replace(/\r/g, '').trim();
    if (trimmed) {
      process.stdout.write(`${prefix} ${trimmed}\n`);
    }
  });
}

function stripTerminalControl(value) {
  return value
    .replace(/\u001bc/g, '')
    .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/\u001b\][^\u0007]*\u0007/g, '');
}
