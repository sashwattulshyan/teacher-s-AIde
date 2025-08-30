const request = require('supertest');
const app = require('../index');

describe('Courses API', () => {
  it('should require auth for GET /api/courses/classroom/:classroomId', async () => {
    const res = await request(app).get('/api/courses/classroom/fakeid');
    expect([401, 403]).toContain(res.statusCode);
  });
});
