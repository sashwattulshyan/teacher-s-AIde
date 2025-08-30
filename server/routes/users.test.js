const request = require('supertest');
const app = require('../index');

describe('Users API', () => {
  it('should require auth for GET /api/users', async () => {
    const res = await request(app).get('/api/users');
    expect([401, 403]).toContain(res.statusCode);
  });
});
