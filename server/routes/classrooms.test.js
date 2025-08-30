const request = require('supertest');
const app = require('../index');

describe('Classrooms API', () => {
  it('should require auth for GET /api/classrooms', async () => {
    const res = await request(app).get('/api/classrooms');
    expect([401, 403]).toContain(res.statusCode);
  });
});
