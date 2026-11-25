// api-part2.spec.ts - "Finish REST properly"
// PUT / PATCH / DELETE, query params, auth headers, and chaining.
// Same pattern as tests/api.spec.ts, but a separate file with its own
// tiny mock API on port 4175, so you can add this file without
// touching api.spec.ts or any UI test.
//
// How it works: the tests start a tiny local API server (beforeAll)
// that behaves like JSONPlaceholder. That way these tests run offline.
// In real life, change API to the real URL, e.g.
//   https://jsonplaceholder.typicode.com
// and delete the mock server - the test code stays exactly the same.
import { test, expect } from '@playwright/test';
import http from 'node:http';

// Serial: all tests share one mock server on port 4175, so they
// must run in one worker, not in parallel.
test.describe.configure({ mode: 'serial' });

const API = 'http://localhost:4175';
const TOKEN = 'Bearer test-token-123';
let server: http.Server;

test.beforeAll(async () => {
  // Tiny mock API: 100 posts, plus PUT / PATCH / DELETE, a ?userId=
  // filter, and a /profile endpoint that needs a Bearer token.
  // POST creates a real post in the list, so chaining works:
  // POST it, GET it, DELETE it, then GET it again -> 404.
  const posts: { userId: number; id: number; title: string; body: string }[] =
    Array.from({ length: 100 }, (_, i) => ({
      userId: Math.floor(i / 10) + 1,
      id: i + 1,
      title: `Post ${i + 1}`,
      body: `Body for post ${i + 1}`,
    }));
  let nextId = 101;

  const readBody = (req: http.IncomingMessage): Promise<Record<string, unknown>> =>
    new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data ? JSON.parse(data) : {}));
    });

  server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const url = new URL(req.url ?? '/', 'http://localhost');
    const idMatch = url.pathname.match(/^\/posts\/(\d+)$/);

    if (req.method === 'GET' && url.pathname === '/profile') {
      if (req.headers.authorization !== TOKEN) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({ userId: 1, name: 'Test User' }));
      }
      return;
    }
    if (req.method === 'GET' && url.pathname === '/posts') {
      const userId = url.searchParams.get('userId');
      const list = userId
        ? posts.filter((p) => p.userId === Number(userId))
        : posts;
      res.writeHead(200);
      res.end(JSON.stringify(list));
      return;
    }
    if (req.method === 'GET' && idMatch) {
      const post = posts.find((p) => p.id === Number(idMatch[1]));
      if (post) {
        res.writeHead(200);
        res.end(JSON.stringify(post));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({}));
      }
      return;
    }
    if (req.method === 'POST' && url.pathname === '/posts') {
      const data = await readBody(req);
      const created = { ...(data as object), id: nextId++ } as {
        userId: number;
        id: number;
        title: string;
        body: string;
      };
      posts.push(created);
      res.writeHead(201);
      res.end(JSON.stringify(created));
      return;
    }
    if ((req.method === 'PUT' || req.method === 'PATCH') && idMatch) {
      const index = posts.findIndex((p) => p.id === Number(idMatch[1]));
      if (index === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({}));
        return;
      }
      const data = await readBody(req);
      // PUT replaces the whole post; PATCH changes only the fields sent.
      posts[index] =
        req.method === 'PUT'
          ? ({ ...(data as object), id: posts[index].id } as (typeof posts)[number])
          : { ...posts[index], ...(data as object) };
      res.writeHead(200);
      res.end(JSON.stringify(posts[index]));
      return;
    }
    if (req.method === 'DELETE' && idMatch) {
      const index = posts.findIndex((p) => p.id === Number(idMatch[1]));
      if (index === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({}));
        return;
      }
      posts.splice(index, 1);
      res.writeHead(200);
      res.end(JSON.stringify({}));
      return;
    }
    res.writeHead(404);
    res.end(JSON.stringify({}));
  });
  await new Promise<void>((resolve) => server.listen(4175, resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('PUT replaces post 1 completely', async ({ request }) => {
  const response = await request.put(`${API}/posts/1`, {
    data: { title: 'Updated title', body: 'Updated body', userId: 1 },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.id).toBe(1);
  expect(body.title).toBe('Updated title');
  expect(body.body).toBe('Updated body');
});

test('PATCH changes only the title of post 2', async ({ request }) => {
  const response = await request.patch(`${API}/posts/2`, {
    data: { title: 'Patched title' },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.id).toBe(2);
  expect(body.title).toBe('Patched title');
  // Everything else is untouched - that is the difference from PUT.
  expect(body.body).toBe('Body for post 2');
  expect(body.userId).toBe(1);
});

test('DELETE removes post 95, then GET returns 404', async ({ request }) => {
  // Post 95, not post 3: deleting a post 1-10 would shrink the
  // ?userId=1 list in the next test from 10 to 9.
  const deleted = await request.delete(`${API}/posts/95`);
  expect(deleted.status()).toBe(200);

  const gone = await request.get(`${API}/posts/95`);
  expect(gone.status()).toBe(404);
});

test('GET with ?userId=1 returns only that user’s 10 posts', async ({ request }) => {
  const response = await request.get(`${API}/posts?userId=1`);

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.length).toBe(10);
  expect(body.every((p: { userId: number }) => p.userId === 1)).toBe(true);
  expect(body[0].id).toBe(1);
});

test('GET /profile without a token returns 401', async ({ request }) => {
  const response = await request.get(`${API}/profile`);

  expect(response.status()).toBe(401);
});

test('GET /profile with a Bearer token returns 200', async ({ request }) => {
  const response = await request.get(`${API}/profile`, {
    headers: { Authorization: TOKEN },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.userId).toBe(1);
  expect(body.name).toBe('Test User');
});

test('chaining: POST a post, GET it, DELETE it, GET returns 404 @smoketest', async ({ request }) => {
  const created = await request.post(`${API}/posts`, {
    data: { title: 'Chained post', body: 'Created, read, then deleted', userId: 1 },
  });
  expect(created.status()).toBe(201);
  const createdBody = await created.json();
  expect(createdBody.id).toBe(101);

  const readBack = await request.get(`${API}/posts/${createdBody.id}`);
  expect(readBack.status()).toBe(200);
  expect((await readBack.json()).title).toBe('Chained post');

  const deleted = await request.delete(`${API}/posts/${createdBody.id}`);
  expect(deleted.status()).toBe(200);

  const gone = await request.get(`${API}/posts/${createdBody.id}`);
  expect(gone.status()).toBe(404);
});
test('PATCH changes only the body of post 5', async ({ request }) => {
  const response = await request.patch(`${API}/posts/5`, {
    data: { body: 'Patched body' },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.id).toBe(5);
  expect(body.body).toBe('Patched body');
  // Everything else is untouched - that is the difference from PUT.
  expect(body.title).toBe('Post 5');
  expect(body.userId).toBe(1);
});