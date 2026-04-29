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
const healthCheckUrl = `${localBackendApiUrl}/health`;

const backendEnvPath = resolveBackendEnvPath();
const dryRun = process.argv.includes('--dry-run');
const logsDir = path.join(frontendDir, '.logs');
const devLogPath = path.join(logsDir, 'dev-stack.log');
const alertsLogPath = path.join(logsDir, 'dev-stack-alerts.log');
const logWatchEnabled = process.env.RUNFLOW_LOG_WATCH !== '0';
const healthCheckEnabled = process.env.RUNFLOW_HEALTH_CHECK !== '0';
const healthCheckIntervalMs = parsePositiveInteger(process.env.RUNFLOW_HEALTH_CHECK_INTERVAL_MS, 60_000);
const healthCheckTimeoutMs = parsePositiveInteger(process.env.RUNFLOW_HEALTH_CHECK_TIMEOUT_MS, 5_000);
const alertCooldownMs = parsePositiveInteger(process.env.RUNFLOW_ALERT_COOLDOWN_MS, 15_000);
const logMode = normalizeLogMode(process.env.RUNFLOW_LOG_MODE);

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
prepareLogFiles();
printPlan();

const children = [];
let healthCheckTimer = null;
let healthCheckStartupTimer = null;
let healthCheckFailed = false;
const recentAlerts = new Map();

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
startHealthCheck();

let shuttingDown = false;

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    stopHealthCheck();
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
    stopHealthCheck();
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
  console.log(`- logs: ${devLogPath}`);
  console.log(`- alerts: ${alertsLogPath}`);
  console.log(`- terminal logs: ${logMode}`);
  if (healthCheckEnabled) {
    console.log(`- health check: ${healthCheckUrl} every ${Math.round(healthCheckIntervalMs / 1000)}s`);
  }
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
  if (logWatchEnabled) {
    console.log('Log watch: enabled. Alerts will be printed as [watch] lines.');
    console.log('');
  }
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
  attachStream(child.stdout, prefix, label);
  attachStream(child.stderr, prefix, label);
}

function attachStream(stream, prefix, label) {
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
        handleOutputLine(prefix, label, trimmed);
      }
    }
  });

  stream.on('end', () => {
    const trimmed = buffer.replace(/\r/g, '').trim();
    if (trimmed) {
      handleOutputLine(prefix, label, trimmed);
    }
  });
}

function handleOutputLine(prefix, label, line) {
  const finding = logWatchEnabled ? classifyLogLine(label, line) : null;

  writeDevLog(prefix, line);

  if (shouldPrintServiceLine(line, finding)) {
    process.stdout.write(`${prefix} ${line}\n`);
  }

  if (finding) {
    emitWatchAlert(finding);
  }
}

function stripTerminalControl(value) {
  return value
    .replace(/\u001bc/g, '')
    .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/\u001b\][^\u0007]*\u0007/g, '');
}

function prepareLogFiles() {
  fs.mkdirSync(logsDir, { recursive: true });

  const header = [
    `# RunFlow dev stack log`,
    `# started_at=${new Date().toISOString()}`,
    `# frontend=${frontendOrigin}`,
    `# backend=${backendApiUrl}`,
    '',
  ].join('\n');

  fs.writeFileSync(devLogPath, header);
  fs.writeFileSync(alertsLogPath, header);
}

function writeDevLog(prefix, line) {
  appendLine(devLogPath, `${new Date().toISOString()} ${prefix} ${line}`);
}

function writeWatchLog(line) {
  appendLine(alertsLogPath, `${new Date().toISOString()} ${line}`);
}

function appendLine(filePath, line) {
  fs.appendFile(filePath, `${line}\n`, (error) => {
    if (error) {
      process.stderr.write(`[watch] WARN log write failed: ${error.message}\n`);
    }
  });
}

function shouldPrintServiceLine(line, finding) {
  if (logMode === 'all') {
    return true;
  }

  if (logMode === 'alerts') {
    return false;
  }

  if (finding && finding.level !== 'INFO') {
    return true;
  }

  const json = parseJsonLine(line);
  if (json) {
    const message = String(json.msg ?? '');
    return /Server listening|API ready|Rate limiting|Using in-memory|loaded successfully/i.test(message);
  }

  return [
    /^>/,
    /VITE .* ready/i,
    /Local:\s+http/i,
    /Network:\s+http/i,
    /Open on phone/i,
    /Failed to resolve import/i,
    /Internal server error/i,
    /Pre-transform error/i,
    /error:/i,
  ].some((pattern) => pattern.test(line));
}

function classifyLogLine(label, line) {
  const json = parseJsonLine(line);
  if (json) {
    return classifyJsonLog(label, line, json);
  }

  return classifyTextLog(label, line);
}

function classifyJsonLog(label, line, entry) {
  const statusCode = getStatusCode(entry);
  const level = Number(entry.level ?? 0);
  const method = entry.req?.method ?? entry.m ?? '';
  const url = entry.req?.url ?? entry.url ?? '';
  const message = String(entry.details?.message ?? entry.message ?? entry.msg ?? '');

  if (statusCode >= 500 || level >= 50) {
    return {
      level: 'CRITICAL',
      label,
      reason: buildHttpReason(statusCode, method, url, message || 'server error'),
      signature: `json:critical:${statusCode}:${method}:${url}:${message}`,
      line,
    };
  }

  if (level >= 40 && !isExpectedAuthNoise(statusCode, message, line)) {
    return {
      level: 'WARN',
      label,
      reason: buildHttpReason(statusCode, method, url, message || 'warning log'),
      signature: `json:warn:${statusCode}:${method}:${url}:${message}`,
      line,
    };
  }

  if (isExpectedAuthNoise(statusCode, message, line)) {
    return {
      level: 'INFO',
      label,
      reason: buildHttpReason(statusCode, method, url, 'expired auth token; log in again if this keeps repeating'),
      signature: `json:auth-expired:${method}:${url}`,
      line,
    };
  }

  return null;
}

function classifyTextLog(label, line) {
  const criticalPatterns = [
    [/Internal server error/i, 'Vite internal server error'],
    [/Pre-transform error/i, 'Vite transform error'],
    [/Failed to resolve import/i, 'missing frontend dependency or bad import path'],
    [/\bCannot find module\b/i, 'missing Node module'],
    [/\bModule not found\b/i, 'missing module'],
    [/\bTypeError\b/i, 'runtime TypeError'],
    [/\bReferenceError\b/i, 'runtime ReferenceError'],
    [/\bSyntaxError\b/i, 'syntax error'],
    [/\bUnhandled(?:PromiseRejection| rejection)?\b/i, 'unhandled async error'],
    [/\bUncaught\b/i, 'uncaught browser/runtime error'],
    [/\bECONNREFUSED\b/i, 'connection refused'],
    [/\bEADDRINUSE\b/i, 'port already in use'],
    [/\bCORS\b/i, 'CORS issue'],
    [/\bPrisma\b/i, 'Prisma/database issue'],
    [/DATABASE_ERROR/i, 'database error'],
  ];

  for (const [pattern, reason] of criticalPatterns) {
    if (pattern.test(line)) {
      return {
        level: 'CRITICAL',
        label,
        reason,
        signature: `text:critical:${reason}:${normalizeAlertLine(line)}`,
        line,
      };
    }
  }

  const warningPatterns = [
    [/\bUNAUTHORIZED\b/i, 'unauthorized response'],
    [/\bFORBIDDEN\b/i, 'forbidden response'],
    [/statusCode["':\s]+4\d\d/i, 'HTTP 4xx response'],
  ];

  for (const [pattern, reason] of warningPatterns) {
    if (pattern.test(line)) {
      return {
        level: 'WARN',
        label,
        reason,
        signature: `text:warn:${reason}:${normalizeAlertLine(line)}`,
        line,
      };
    }
  }

  return null;
}

function emitWatchAlert(finding) {
  const summary = `[watch] ${finding.level} ${finding.label}: ${finding.reason} | ${summarizeLine(finding.line)}`;
  writeWatchLog(summary);

  const now = Date.now();
  const lastPrintedAt = recentAlerts.get(finding.signature) ?? 0;
  if (now - lastPrintedAt < alertCooldownMs) {
    return;
  }

  recentAlerts.set(finding.signature, now);
  process.stdout.write(`${summary}\n`);
}

function parseJsonLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function getStatusCode(entry) {
  return Number(entry.statusCode ?? entry.status ?? entry.res?.statusCode ?? entry.details?.statusCode ?? 0);
}

function isExpectedAuthNoise(statusCode, message, line) {
  return statusCode === 401 && /token expired|authorization token expired/i.test(`${message} ${line}`);
}

function buildHttpReason(statusCode, method, url, fallback) {
  const target = [method, url].filter(Boolean).join(' ');
  const status = statusCode ? `HTTP ${statusCode}` : null;
  return [status, target, fallback].filter(Boolean).join(' - ');
}

function normalizeAlertLine(line) {
  return line
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/"time":\d+/g, '"time":<time>')
    .replace(/"pid":\d+/g, '"pid":<pid>')
    .replace(/"remotePort":\d+/g, '"remotePort":<port>')
    .replace(/"rt":\d+(?:\.\d+)?/g, '"rt":<ms>')
    .replace(/"responseTime":\d+(?:\.\d+)?/g, '"responseTime":<ms>');
}

function summarizeLine(line) {
  const compact = line.replace(/\s+/g, ' ').trim();
  return compact.length > 220 ? `${compact.slice(0, 217)}...` : compact;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeLogMode(value) {
  const normalized = String(value ?? 'compact').toLowerCase();
  return ['all', 'compact', 'alerts'].includes(normalized) ? normalized : 'compact';
}

function startHealthCheck() {
  if (!healthCheckEnabled) {
    return;
  }

  healthCheckTimer = setInterval(runHealthCheck, healthCheckIntervalMs);
  healthCheckStartupTimer = setTimeout(runHealthCheck, 3_000);
}

function stopHealthCheck() {
  if (healthCheckStartupTimer) {
    clearTimeout(healthCheckStartupTimer);
    healthCheckStartupTimer = null;
  }

  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

async function runHealthCheck() {
  const startedAt = Date.now();
  let timeout = null;

  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), healthCheckTimeoutMs);
    const response = await fetch(healthCheckUrl, { signal: controller.signal });

    const text = await response.text();
    const body = parseHealthBody(text);
    const healthy = response.ok && (!body?.status || body.status === 'healthy');
    const elapsed = Date.now() - startedAt;

    writeDevLog('[health]', `${response.status} ${healthy ? 'healthy' : 'unhealthy'} ${elapsed}ms ${healthCheckUrl}`);

    if (!healthy) {
      healthCheckFailed = true;
      emitWatchAlert({
        level: 'CRITICAL',
        label: 'health',
        reason: `health check failed: HTTP ${response.status}${body?.status ? ` ${body.status}` : ''}`,
        signature: `health:${response.status}:${body?.status ?? 'unknown'}`,
        line: text || `${response.status} ${response.statusText}`,
      });
      return;
    }

    if (healthCheckFailed) {
      healthCheckFailed = false;
      const recovered = `[watch] INFO health: recovered | ${healthCheckUrl}`;
      writeWatchLog(recovered);
      process.stdout.write(`${recovered}\n`);
    }
  } catch (error) {
    healthCheckFailed = true;
    writeDevLog('[health]', `failed ${healthCheckUrl}: ${error.message}`);
    emitWatchAlert({
      level: 'CRITICAL',
      label: 'health',
      reason: `health check failed: ${error.message}`,
      signature: `health:error:${error.message}`,
      line: healthCheckUrl,
    });
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function parseHealthBody(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
