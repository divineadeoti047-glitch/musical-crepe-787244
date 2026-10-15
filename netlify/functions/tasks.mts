import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { taskWorkspaces } from '../../db/schema.js';
export default async (req: Request) => {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  let id = /(?:^|;\s*)daystar_workspace=([a-f0-9]{64})(?:;|$)/.exec(req.headers.get('cookie') || '')?.[1];
  if (!id) {
    id = randomBytes(32).toString('hex');
    headers.set('Set-Cookie', `daystar_workspace=${id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=31536000`);
  }
  if (req.method === 'GET') {
    try {
      const [row] = await db.select().from(taskWorkspaces).where(eq(taskWorkspaces.id, id));
      return Response.json({ tasks: row?.tasks ?? null }, { headers });
    } catch { return Response.json({ error: 'Task storage is temporarily unavailable.' }, { status: 503, headers }); }
  }
  if (req.method !== 'PUT') return new Response('Method not allowed', { status: 405, headers });
  if (req.headers.get('origin') !== new URL(req.url).origin) return new Response('Forbidden', { status: 403, headers });
  try {
    const raw = await req.text();
    if (raw.length > 500000) return new Response('Too large', { status: 413, headers });
    const { tasks } = JSON.parse(raw);
    if (!Array.isArray(tasks) || tasks.length > 500 || tasks.some(t =>
      !t || typeof t.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(t.id) ||
      typeof t.name !== 'string' || !t.name.trim() || t.name.length > 200 ||
      typeof t.group !== 'string' || !Number.isFinite(t.target) || t.target < 0 || t.target > 1440 ||
      (t.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.startTime)))) {
      return new Response('Invalid tasks', { status: 400, headers });
    }
    await db.insert(taskWorkspaces).values({ id, tasks }).onConflictDoUpdate({ target: taskWorkspaces.id, set: { tasks, updatedAt: new Date() } });
    return Response.json({ saved: true }, { headers });
  } catch { return Response.json({ error: 'Tasks could not be saved online.' }, { status: 503, headers }); }
};
