# Bug Report System Setup

## Overview
The bug report system allows both teachers and students to report issues directly from the app. Reports are automatically sent to `teachers.aide.app@gmail.com` with comprehensive information including console errors, browser details, and user context.

## Features
- **🐛 Bug Report Button**: Available on both teacher and student dashboards
- **📝 Comprehensive Form**: Captures detailed bug information
- **🖥️ Console Error Capture**: Automatically captures JavaScript errors and warnings
- **📧 Email Integration**: Sends formatted reports via email
- **👤 User Context**: Includes user role, name, and email information

## Environment Variables Required

### Server (.env)
```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=teachers.aide.app@gmail.com
EMAIL_PASS=your_gmail_app_password
# OR
GMAIL_APP_PASSWORD=your_gmail_app_password
```

## Gmail App Password Setup

1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification
3. At the bottom, select "App passwords"
4. Generate a new app password for "Mail"
5. Use this password in the `EMAIL_PASS` or `GMAIL_APP_PASSWORD` environment variable

## API Endpoint

**POST** `/api/bug-report`

### Request Body
```json
{
  "description": "What went wrong?",
  "steps": "Steps to reproduce",
  "expectedBehavior": "What you expected",
  "actualBehavior": "What actually happened",
  "additionalInfo": "Any additional details",
  "userRole": "teacher|student",
  "userName": "User's name",
  "userEmail": "user@example.com",
  "consoleErrors": [...],
  "browserInfo": {...},
  "screenInfo": {...},
  "windowInfo": {...},
  "url": "https://app.example.com/page",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Email Format

Bug reports are sent as both HTML and plain text emails with:
- User information and context
- Detailed bug description
- Steps to reproduce
- Expected vs actual behavior
- Browser and system information
- Console errors (last 5 shown, all included in full report)
- Timestamp and URL information

## Console Error Capture

The system automatically captures:
- `console.error()` calls
- `console.warn()` calls
- Unhandled JavaScript errors
- Unhandled Promise rejections

Errors are stored in `window.consoleErrors` and included in bug reports.

## Testing

To test the bug report system:

1. Open the app as a teacher or student
2. Click the "🐛 Report Bug" button in the dashboard header
3. Fill out the form with test information
4. Submit the report
5. Check `teachers.aide.app@gmail.com` for the report

## Troubleshooting

### Email Not Sending
- Verify Gmail app password is correct
- Check that 2FA is enabled on the Gmail account
- Ensure environment variables are set correctly in Render

### Console Errors Not Captured
- Check browser console for JavaScript errors
- Verify the error capture is working by opening browser dev tools
- Errors are stored in `window.consoleErrors`

### Modal Not Opening
- Check browser console for JavaScript errors
- Verify the BugReportModal component is imported correctly
- Ensure the button click handler is working
