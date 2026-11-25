// api.spec.ts - "Can I test a REST API with Playwright?"
// Same checks you do in Postman, but in code so they run in CI.
// No browser, no UI - `request` talks straight to the server.
//
// How it works here: the tests start a tiny local API server
// (see beforeAll below) that behaves like JSONPlaceholder, a free
// public test API. That way these tests run offline, just like the
// UI tests run against the vendored PDF app.
// In real life, change API to the real URL, e.g.
//   https://jsonplaceholder.typicode.com
// and delete the mock server - the test code stays exactly the same.
import { test, expect } from '@playwright/test';
import http from 'node:http';

// Serial: all 4 tests share one mock server on port 4174, so they
// must run in one worker, not in parallel.
test.describe.configure({ mode: 'serial' });

const API = 'http://localhost:4174';
let server: http.Server;

test.beforeAll(async () => {
  // Tiny mock API: 100 posts, GET one / all, POST creates id 101.
  const posts = Array.from({ length: 100 }, (_, i) => ({
    userId: Math.floor(i / 10) + 1,
    id: i + 1,
    title: `Post ${i + 1}`,
    body: `Body for post ${i + 1}`,
  }));
  server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && req.url === '/posts') {
      res.writeHead(200);
      res.end(JSON.stringify(posts));
    } else if (req.method === 'GET' && req.url?.startsWith('/posts/')) {
      const id = Number(req.url.split('/')[2]);
      const post = posts.find((p) => p.id === id);
      if (post) {
        res.writeHead(200);
        res.end(JSON.stringify(post));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({}));
      }
    } else if (req.method === 'POST' && req.url === '/posts') {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        res.writeHead(201);
        res.end(JSON.stringify({ ...JSON.parse(data), id: 101 }));
      });
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({}));
    }
  });
  await new Promise<void>((resolve) => server.listen(4174, resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('GET one post returns 200 and the right post @smoketest', async ({ request }) => {
  const response = await request.get(`${API}/posts/1`);

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.id).toBe(1);
  expect(body.userId).toBe(1);
  expect(body.title).toBeTruthy();
});

test('GET all posts returns a list of 100 posts', async ({ request }) => {
  const response = await request.get(`${API}/posts`);

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBe(100);
  expect(body[0].id).toBe(1);
});

test('POST a new post returns 201 and echoes what you sent', async ({ request }) => {
  const response = await request.post(`${API}/posts`, {
    data: { title: 'Test post from Playwright', body: 'Hello API', userId: 1 },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.title).toBe('Test post from Playwright');
  expect(body.body).toBe('Hello API');
  expect(body.userId).toBe(1);
  expect(body.id).toBe(101);
});

test('GET a post that does not exist returns 404', async ({ request }) => {
  const response = await request.get(`${API}/posts/99999`);

  expect(response.status()).toBe(404);
});
test('GET post 2 returns 200 and id 2', async ({ request }) => {
  const response = await request.get(`${API}/posts/2`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.id).toBe(2);
  expect(body.userId).toBe(1);
});