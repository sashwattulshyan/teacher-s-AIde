# Teachers AIde Backend

## Features
- Custom authentication endpoints (register, login, etc.)
- Robust validation using express-validator
- Standardized error handling
- Automated API documentation with Swagger UI
- Ready for Jest-based testing

## Usage

### Start the server
```
npm run dev
```

### Run tests
```
npm test
```

### View API documentation
Visit [http://localhost:3001/api/docs](http://localhost:3001/api/docs) after starting the server.

## Validation & Error Handling
- All endpoints that accept input use express-validator for robust validation.
- Errors are returned in a consistent JSON format with status codes and messages.

---

For more details, see the Swagger docs or the code in `/routes`.

## Admin Analytics Endpoints

All endpoints require an authenticated user with the `admin` role.

- `GET /api/admin/stats` — Returns total users, classrooms, courses, and lessons.
- `GET /api/admin/popular-courses` — Returns the most popular courses (by number of students).

## OpenAI Configuration
Create a `.env` file in `server/` and add:

```
OPENAI_API_KEY=your_openai_api_key_here
# Optional, defaults to gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini
```

Restart the server after setting environment variables.

## Client Integration Notes
- LessonManager now supports:
  - Uploading materials via `POST /api/ai/upload`
  - Generating lessons/quizzes with AI via `POST /api/ai/generate-lesson` and `POST /api/ai/generate-quiz`
- Set `VITE_SERVER_URL` in the client environment (e.g., `.env`) if your server is not `http://localhost:3001`.
