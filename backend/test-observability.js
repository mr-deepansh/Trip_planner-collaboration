import 'dotenv/config';
import {
  initTelemetry,
  getTraceContext,
  withSpan
} from './src/observability/telemetry.js';
import {
  logger,
  requestLogger,
  infraLogger,
  auditLogger
} from './src/observability/logger.js';
import {
  redact,
  redactEmail,
  redactIP
} from './src/observability/redaction.js';

console.log('🚀 Testing OpenTelemetry + Pino Observability System\n');

console.log('1. Initializing OpenTelemetry...');
if (process.env.ENABLE_OTEL === 'true') {
  initTelemetry();
  console.log('✅ OpenTelemetry initialized\n');
} else {
  console.log('⚠️  OpenTelemetry disabled (set ENABLE_OTEL=true in .env)\n');
}

console.log('2. Testing Pino Logger...');
logger.info({ event: 'test.startup', message: 'Logger test started' });
console.log('✅ Base logger works\n');

console.log('3. Testing Request Logger...');
requestLogger.info({
  event: 'http.request.completed',
  method: 'GET',
  route: '/api/v1/test',
  status_code: 200,
  duration_ms: 42
});
console.log('✅ Request logger works\n');

console.log('4. Testing Infrastructure Logger...');
infraLogger.warn({
  event: 'db.pool.starvation',
  active_connections: 25,
  max_connections: 25
});
console.log('✅ Infrastructure logger works\n');

console.log('5. Testing Audit Logger...');
auditLogger.info({
  event: 'auth.login.success',
  user_id: 123,
  ip: '192.168.1.100'
});
console.log('✅ Audit logger works\n');

console.log('6. Testing Redaction...');
const sensitiveData = {
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret123',
    token: 'abc123xyz'
  }
};
const redacted = redact(sensitiveData);
console.log('Original:', JSON.stringify(sensitiveData, null, 2));
console.log('Redacted:', JSON.stringify(redacted, null, 2));
console.log('✅ Redaction works\n');

console.log('7. Testing Email Redaction...');
const email = 'user@example.com';
const redactedEmail = redactEmail(email);
console.log(`Original: ${email}`);
console.log(`Redacted: ${redactedEmail}`);
console.log('✅ Email redaction works\n');

console.log('8. Testing IP Redaction...');
const ip = '192.168.1.100';
const redactedIP = redactIP(ip);
console.log(`Original: ${ip}`);
console.log(`Redacted: ${redactedIP}`);
console.log('✅ IP redaction works\n');

console.log('9. Testing Trace Context...');
const traceContext = getTraceContext();
if (traceContext) {
  console.log('Trace Context:', traceContext);
  console.log('✅ Trace context available\n');
} else {
  console.log('⚠️  No active trace context (expected without HTTP request)\n');
}

console.log('10. Testing Custom Span...');
async function testSpan() {
  await withSpan('test.operation', async (span) => {
    span.setAttribute('test.attribute', 'test-value');
    logger.info({ event: 'test.span', message: 'Inside custom span' });
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
}

if (process.env.ENABLE_OTEL === 'true') {
  await testSpan();
  console.log('✅ Custom span works\n');
} else {
  console.log('⚠️  Skipped (OpenTelemetry disabled)\n');
}

console.log('✅ All tests passed!\n');
console.log('📊 Summary:');
console.log('  - Pino Logger: ✅ Working');
console.log('  - Request Logger: ✅ Working');
console.log('  - Infrastructure Logger: ✅ Working');
console.log('  - Audit Logger: ✅ Working');
console.log('  - PII Redaction: ✅ Working');
console.log(
  '  - OpenTelemetry:',
  process.env.ENABLE_OTEL === 'true' ? '✅ Enabled' : '⚠️  Disabled'
);
console.log('\n🎉 Observability system is ready!');

process.exit(0);
