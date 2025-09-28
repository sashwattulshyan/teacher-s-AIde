# Email Debugging Guide

## Overview
This guide helps you debug email issues with the bug report system. I've added comprehensive logging throughout the system to help identify where the email sending process is failing.

## Enhanced Logging Features Added

### 1. Server-Side Logging (`server/routes/bug-report.js`)

#### Environment Variable Logging
- Logs all email-related environment variables on startup
- Shows which variables are set/not set (passwords are masked)
- Validates required configuration before attempting to send emails

#### Email Transporter Verification
- Automatically verifies email transporter configuration
- Logs connection success/failure with detailed error information
- Shows authentication status and SMTP server response

#### Detailed Error Handling
- Enhanced error logging with specific error codes
- Timeout handling (30-second timeout for email sending)
- Email-specific error detection (EAUTH, EENVELOPE, EMESSAGE)
- Comprehensive error response to client

#### Email Content Validation
- Validates email from/to addresses
- Checks subject and content are not empty
- Logs email content lengths and structure

### 2. Client-Side Logging (`client/src/components/BugReportModal.jsx`)

#### Request Logging
- Logs detailed request information before sending
- Shows request body size, timestamp, and user context
- Tracks network status and connectivity

#### Response Logging
- Detailed response analysis with headers
- JSON error response parsing
- Network error detection and troubleshooting hints

#### Error Categorization
- Distinguishes between network errors and server errors
- Provides specific troubleshooting guidance
- Logs user agent and browser information

### 3. Test Endpoint
- New `/api/bug-report/test-email` endpoint for testing email configuration
- Sends a test email to verify the setup
- Returns detailed success/failure information

## How to Debug Email Issues

### Step 1: Check Environment Variables
Look for these logs in your server console:
```
🐛 BugReport: Environment variables check
```

**What to look for:**
- `EMAIL_HOST` should be `smtp.gmail.com`
- `EMAIL_PORT` should be `587`
- `EMAIL_USER` should be `teachers.aide.app@gmail.com`
- `EMAIL_PASS` or `GMAIL_APP_PASSWORD` should show `***SET***`

### Step 2: Test Email Configuration
Run the test script:
```bash
node test-email-config.js
```

Or use the test endpoint:
```bash
curl http://localhost:3001/api/bug-report/test-email
```

### Step 3: Check Transporter Verification
Look for these logs:
```
🐛 BugReport: Email transporter verified successfully
```

If you see verification errors, check:
- Gmail app password is correct
- 2-factor authentication is enabled
- App password was generated for "Mail"

### Step 4: Monitor Bug Report Submission
When submitting a bug report, watch for these logs:

**Client-side:**
```
🐛 BugReportModal: Sending request to /api/bug-report
🐛 BugReportModal: Response received
```

**Server-side:**
```
🐛 BugReport [requestId]: POST request received
🐛 BugReport [requestId]: Email options prepared
🐛 BugReport [requestId]: Attempting to send email
🐛 BugReport [requestId]: Email sent successfully
```

### Step 5: Check for Specific Errors

#### Authentication Errors (EAUTH)
```
🐛 BugReport: Email authentication/configuration error
```
**Solution:** Check your Gmail app password

#### Network Errors
```
🐛 BugReportModal: Network error detected
```
**Solution:** Check server connectivity and CORS settings

#### Timeout Errors
```
Email sending timeout after 30 seconds
```
**Solution:** Check network connectivity and SMTP server status

## Common Issues and Solutions

### 1. "Email password not configured"
- Set `EMAIL_PASS` or `GMAIL_APP_PASSWORD` in your `.env` file
- Use a Gmail app password, not your regular password

### 2. "Email authentication/configuration error"
- Verify your Gmail app password is correct
- Ensure 2-factor authentication is enabled
- Check that the app password was generated for "Mail"

### 3. "Email sending timeout"
- Check your internet connection
- Verify SMTP server is accessible
- Check firewall settings

### 4. "Failed to connect to server"
- Ensure the server is running
- Check the API endpoint is accessible
- Verify CORS configuration

## Testing Your Setup

### 1. Run the Test Script
```bash
cd /Users/sashwattulshyan/Documents/your-edu-app
node test-email-config.js
```

### 2. Test the API Endpoint
```bash
curl -X GET http://localhost:3001/api/bug-report/test-email
```

### 3. Submit a Test Bug Report
1. Open your app in the browser
2. Click the "🐛 Report Bug" button
3. Fill out the form and submit
4. Check both browser console and server logs

## Log Locations

### Server Logs
- Check your server console output
- Look for logs starting with `🐛 BugReport`

### Client Logs
- Open browser Developer Tools (F12)
- Go to Console tab
- Look for logs starting with `🐛 BugReportModal`

## Environment Variables Required

Create a `.env` file in your server directory with:
```bash
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

## Next Steps

1. **Check the logs** - Look for the detailed logging I've added
2. **Run the test script** - Use `node test-email-config.js` to verify your setup
3. **Test the API endpoint** - Use the `/api/bug-report/test-email` endpoint
4. **Submit a test bug report** - Try the actual bug report flow
5. **Check both client and server logs** - Look for any error messages

The enhanced logging will help you identify exactly where the email sending process is failing, whether it's authentication, network connectivity, or configuration issues.
