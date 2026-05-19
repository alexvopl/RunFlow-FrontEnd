import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const frontendDir = process.cwd();
const frontendFileEnv = loadEnvFile(frontendDir);
const frontendBaseEnv = { ...frontendFileEnv, ...process.env };

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
const localFrontendUrl = `http://localhost:${frontendPort}`;
const localBackendApiUrl = `http://localhost:${backendPort}/api`;
const healthCheckUrl = `${localBackendApiUrl}/health`;

const dryRun = process.argv.includes('--dry-run');
const logsDir = path.join(frontendDir, '.logs');
const devLogPath = path.join(logsDir, 'dev-frontend.log');
const alertsLogPath = path.join(logsDir, 'dev-frontend-alerts.log');
const logWatchEnabled = process.env.RUNFLOW_LOG_WATCH !== '0';
const healthCheckEnabled = process.env.RUNFLOW_HEALTH_CHECK !== '0';
const healthCheckIntervalMs = parsePositiveInteger(process.env.RUNFLOW_HEALTH_CHECK_INTERVAL_MS, 60_000);
const healthCheckTimeoutMs = parsePositiveInteger(process.env.RUNFLOW_HEALTH_CHECK_TIMEOUT_MS, 5_000);
const alertCooldownMs = parsePositiveInteger(process.env.RUNFLOW_ALERT_COOLDOWN_MS, 15_000);
const logMode = normalizeLogMode(process.env.RUNFLOW_LOG_MODE);

const frontendEnv = {
  ...frontendFileEnv,
  ...process.env,
  VITE_API_URL: frontendBaseEnv.VITE_API_URL ?? localBackendApiUrl,
  VITE_APP_URL: frontendPublicUrl,
  VITE_AUTH_REDIRECT_URL: authRedirectUrl,
  VITE_PASSWORD_RESET_URL: passwordResetUrl,
  VITE_DEV_PORT: frontendBaseEnv.VITE_DEV_PORT ?? frontendPort,
  VITE_DEV_HOST: lanIp,
  NO_COLOR: '1',
  FORCE_COLOR: '0',
};

if (dryRun) {
  printPlan();
  process.exit(0);
}

ensureDependencies(frontendDir, 'node_modules', 'npm', ['install']);
prepareLogFiles();
printPlan();

let healthCheckTimer = null;
let healthCheckStartupTimer = null;
let healthCheckFailed = false;
const recentAlerts = new Map();

const frontend = spawn('npm', ['run', 'dev', '--', '--port', frontendPort, '--clearScreen', 'false'], {
  cwd: frontendDir,
  env: frontendEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
pipeOutput(frontend, 'frontend');
startHealthCheck();

let shuttingDown = false;

frontend.on('exit', (code, signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  stopHealthCheck();
  if (signal) { process.kill(process.pid, signal); return; }
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopHealthCheck();
    if (frontend.pid) frontend.kill('SIGTERM');
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function printPlan() {
  console.log('');
  console.log('RunFlow frontend');
  console.log(`- frontend local:   ${localFrontendUrl}`);
  console.log(`- frontend public:  ${frontendPublicUrl}`);
  console.log(`- phone url:        ${frontendOrigin}`);
  console.log(`- api url:          ${frontendEnv.VITE_API_URL}`);
  console.log(`- logs:             ${devLogPath}`);
  console.log(`- alerts:           ${alertsLogPath}`);
  console.log(`- terminal logs:    ${logMode}`);
  if (healthCheckEnabled) {
    console.log(`- health check:     ${healthCheckUrl} every ${Math.round(healthCheckIntervalMs / 1000)}s`);
  }
  console.log('');
  console.log('Open on phone:');
  console.log(`  ${frontendOrigin}`);
  console.log('');
  console.log('Useful local URLs:');
  console.log(`  frontend: ${localFrontendUrl}`);
  console.log(`  backend:  ${localBackendApiUrl}`);
  console.log('');
  if (logWatchEnabled) {
    console.log('Log watch: enabled. Alerts will be printed as [watch] lines.');
    console.log('');
  }
}

function getLocalIp() {
  const networks = os.networkInterfaces();
  for (const entries of Object.values(networks)) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      if (entry.address.startsWith('192.168.') || entry.address.startsWith('10.') || entry.address.startsWith('172.')) {
        return entry.address;
      }
    }
  }
  return null;
}

function getPortFromUrl(value) {
  if (!value) return null;
  try { return new URL(value).port || null; } catch { return null; }
}

function loadEnvFile(baseDir) {
  for (const candidate of [path.join(baseDir, '.env.local'), path.join(baseDir, '.env')]) {
    if (fs.existsSync(candidate)) return parseEnvFile(candidate);
  }
  return {};
}

function parseEnvFile(filePath) {
  const parsed = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function ensureDependencies(baseDir, folderName, command, args) {
  if (process.env.RUNFLOW_SKIP_INSTALL === '1') return;
  if (fs.existsSync(path.join(baseDir, folderName))) return;
  console.log(`missing ${folderName}, running ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: baseDir, stdio: 'inherit', env: process.env });
  if (result.status !== 0) { console.error('failed to install dependencies'); process.exit(1); }
}

function prepareLogFiles() {
  fs.mkdirSync(logsDir, { recursive: true });
  const header = [
    `# RunFlow frontend log`,
    `# started_at=${new Date().toISOString()}`,
    `# frontend=${frontendOrigin}`,
    `# backend=${localBackendApiUrl}`,
    '',
  ].join('\n');
  fs.writeFileSync(devLogPath, header);
  fs.writeFileSync(alertsLogPath, header);
}

function pipeOutput(child, label) {
  const prefix = `[${label}]`;
  attachStream(child.stdout, prefix, label);
  attachStream(child.stderr, prefix, label);
}

function attachStream(stream, prefix, label) {
  if (!stream) return;
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += stripTerminalControl(chunk.toString('utf8'));
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.replace(/\r/g, '').trimEnd();
      if (trimmed) handleOutputLine(prefix, label, trimmed);
    }
  });
  stream.on('end', () => {
    const trimmed = buffer.replace(/\r/g, '').trim();
    if (trimmed) handleOutputLine(prefix, label, trimmed);
  });
}

function handleOutputLine(prefix, label, line) {
  const finding = logWatchEnabled ? classifyLogLine(label, line) : null;
  writeDevLog(prefix, line);
  if (shouldPrintServiceLine(line, finding)) process.stdout.write(`${prefix} ${line}\n`);
  if (finding) emitWatchAlert(finding);
}

function stripTerminalControl(value) {
  return value
    .replace(/c/g, '')
    .replace(/\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/\][^]*/g, '');
}

function shouldPrintServiceLine(line, finding) {
  if (logMode === 'all') return true;
  if (logMode === 'alerts') return false;
  if (finding && finding.level !== 'INFO') return true;
  return [
    /^>/,
    /VITE .* ready/i,
    /Local:\s+http/i,
    /Network:\s+http/i,
    /Failed to resolve import/i,
    /Internal server error/i,
    /Pre-transform error/i,
    /error:/i,
  ].some((p) => p.test(line));
}

function classifyLogLine(label, line) {
  return classifyTextLog(label, line);
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
  ];
  for (const [pattern, reason] of criticalPatterns) {
    if (pattern.test(line)) {
      return { level: 'CRITICAL', label, reason, signature: `text:critical:${reason}:${normalizeAlertLine(line)}`, line };
    }
  }
  return null;
}

function emitWatchAlert(finding) {
  const summary = `[watch] ${finding.level} ${finding.label}: ${finding.reason} | ${summarizeLine(finding.line)}`;
  writeWatchLog(summary);
  const now = Date.now();
  const lastPrintedAt = recentAlerts.get(finding.signature) ?? 0;
  if (now - lastPrintedAt < alertCooldownMs) return;
  recentAlerts.set(finding.signature, now);
  process.stdout.write(`${summary}\n`);
}

function writeDevLog(prefix, line) {
  appendLine(devLogPath, `${new Date().toISOString()} ${prefix} ${line}`);
}

function writeWatchLog(line) {
  appendLine(alertsLogPath, `${new Date().toISOString()} ${line}`);
}

function appendLine(filePath, line) {
  fs.appendFile(filePath, `${line}\n`, (err) => {
    if (err) process.stderr.write(`[watch] WARN log write failed: ${err.message}\n`);
  });
}

function startHealthCheck() {
  if (!healthCheckEnabled) return;
  healthCheckTimer = setInterval(runHealthCheck, healthCheckIntervalMs);
  healthCheckStartupTimer = setTimeout(runHealthCheck, 3_000);
}

function stopHealthCheck() {
  if (healthCheckStartupTimer) { clearTimeout(healthCheckStartupTimer); healthCheckStartupTimer = null; }
  if (healthCheckTimer) { clearInterval(healthCheckTimer); healthCheckTimer = null; }
}

async function runHealthCheck() {
  const startedAt = Date.now();
  let timeout = null;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), healthCheckTimeoutMs);
    const response = await fetch(healthCheckUrl, { signal: controller.signal });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not json */ }
    const healthy = response.ok && (!body?.status || body.status === 'healthy');
    const elapsed = Date.now() - startedAt;
    writeDevLog('[health]', `${response.status} ${healthy ? 'healthy' : 'unhealthy'} ${elapsed}ms ${healthCheckUrl}`);
    if (!healthy) {
      healthCheckFailed = true;
      emitWatchAlert({
        level: 'CRITICAL', label: 'health',
        reason: `backend health check failed: HTTP ${response.status}`,
        signature: `health:${response.status}`, line: text || `${response.status}`,
      });
      return;
    }
    if (healthCheckFailed) {
      healthCheckFailed = false;
      const recovered = `[watch] INFO health: backend recovered | ${healthCheckUrl}`;
      writeWatchLog(recovered);
      process.stdout.write(`${recovered}\n`);
    }
  } catch (error) {
    healthCheckFailed = true;
    writeDevLog('[health]', `failed ${healthCheckUrl}: ${error.message}`);
    emitWatchAlert({
      level: 'CRITICAL', label: 'health',
      reason: `backend unreachable: ${error.message}`,
      signature: `health:error:${error.message}`, line: healthCheckUrl,
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeAlertLine(line) {
  return line
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/"time":\d+/g, '"time":<time>')
    .replace(/"pid":\d+/g, '"pid":<pid>');
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
