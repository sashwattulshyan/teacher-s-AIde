const request = require('supertest');
const app = require('../index');

describe('Lessons API', () => {
  it('should require auth for GET /api/lessons/course/:courseId', async () => {
    const res = await request(app).get('/api/lessons/course/fakeid');
    expect([401, 403]).toContain(res.statusCode);
  });
});
