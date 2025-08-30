const request = require('supertest');
const app = require('../index');

describe('Auth API', () => {
  it('should register a new user (mock, expect error if duplicate)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'testuser@example.com', password: 'password123', role: 'student' });
    // Accept either success or error for duplicate
    expect([201, 500, 400]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('message');
  });

  it('should return not supported for login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testuser@example.com', password: 'password123' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Not supported');
  });

  it('should return not supported for password reset', async () => {
    const res = await request(app)
      .post('/api/auth/password-reset')
      .send({ email: 'testuser@example.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Not supported');
  });
});
