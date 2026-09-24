import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');

describe('Asset API safety gate', () => {
  it('rejects an upload mutation without a CSRF token before it can reach asset storage', async () => {
    const api = createDashboardApiHandler({ services: { auth: { authenticate: async () => null } } });
    const request = Readable.from([Buffer.from('--boundary\r\nContent-Disposition: form-data; name="file"; filename="logo.png"\r\nContent-Type: image/png\r\n\r\nfile\r\n--boundary--\r\n')]);
    Object.assign(request, { method: 'POST', url: '/api/projects/prj_test/assets/upload', headers: { host: 'dashboard.test', 'content-type': 'multipart/form-data; boundary=boundary' }, socket: { remoteAddress: '127.0.0.1' } });
    const response = { status: null, body: '', writeHead(status) { this.status = status; }, end(value = '') { this.body += value; } };
    await api(request, response);
    expect(response.status).toBe(403);
    expect(JSON.parse(response.body).error.code).toBe('csrf_invalid');
  });
});
