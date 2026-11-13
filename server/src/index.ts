import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { auth } from './auth';
import { withContext, type AppEnv } from './lib/context';
import { fail } from './lib/errors';
import { auditRoutes } from './modules/audit';
import { branchRoutes } from './modules/branches';
import { meRoutes } from './modules/me';
import { overviewRoutes } from './modules/overview';
import { roleRoutes } from './modules/roles';
import { staffRoutes } from './modules/staff';
import { tenantRoutes } from './modules/tenant';

const app = new Hono();

app.use('*', logger());

// Better Auth owns /api/auth/* (sign-in, sign-out, session).
app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

const api = new Hono<AppEnv>();

api.get('/health', (c) => c.json({ ok: true, service: 'gym-erp-api', at: new Date().toISOString() }));

const guarded = new Hono<AppEnv>();
guarded.use('*', withContext);
guarded.route('/me', meRoutes);
guarded.route('/overview', overviewRoutes);
guarded.route('/tenant', tenantRoutes);
guarded.route('/branches', branchRoutes);
guarded.route('/staff', staffRoutes);
guarded.route('/roles', roleRoutes);
guarded.route('/audit-log', auditRoutes);

api.route('/', guarded);
app.route('/api/v1', api);

app.notFound((c) => fail(c, 404, 'not_found', 'Route not found.'));
app.onError((error, c) => {
  console.error('[api] unhandled error', error);
  return fail(c, 500, 'internal_error', 'Something went wrong. Please try again.');
});

const port = Number(process.env.PORT ?? 8000);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`[api] listening on http://0.0.0.0:${info.port}`);
});
