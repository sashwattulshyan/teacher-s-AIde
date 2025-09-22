const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Create transporter for sending emails
const createTransporter = () => {
  console.log('🐛 BugReport: Creating email transporter');
  
  // Try to use environment variables for email configuration
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'teachers.aide.app@gmail.com',
      pass: process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD
    }
  };
  
  console.log('🐛 BugReport: Email configuration', {
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    hasUser: !!emailConfig.auth.user,
    hasPass: !!emailConfig.auth.pass,
    userEmail: emailConfig.auth.user
  });
  
  const transporter = nodemailer.createTransport(emailConfig);
  console.log('🐛 BugReport: Email transporter created successfully');
  
  return transporter;
};

// Format console errors for email
const formatConsoleErrors = (errors) => {
  console.log('🐛 BugReport: Formatting console errors', { errorCount: errors?.length || 0 });
  
  if (!errors || errors.length === 0) {
    console.log('🐛 BugReport: No console errors to format');
    return 'No console errors captured.';
  }

  const formattedErrors = errors.map((error, index) => {
    const time = new Date(error.timestamp).toLocaleString();
    const formatted = `${index + 1}. [${error.type.toUpperCase()}] ${time}\n   ${error.message}${error.stack ? `\n   Stack: ${error.stack}` : ''}`;
    console.log(`🐛 BugReport: Formatted error ${index + 1}`, { type: error.type, message: error.message.substring(0, 100) });
    return formatted;
  }).join('\n\n');
  
  console.log('🐛 BugReport: Console errors formatted successfully', { totalLength: formattedErrors.length });
  return formattedErrors;
};

// Format browser info for email
const formatBrowserInfo = (browserInfo) => {
  console.log('🐛 BugReport: Formatting browser info', { browserInfo });
  const formatted = Object.entries(browserInfo)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  console.log('🐛 BugReport: Browser info formatted', { length: formatted.length });
  return formatted;
};

// Format screen info for email
const formatScreenInfo = (screenInfo) => {
  console.log('🐛 BugReport: Formatting screen info', { screenInfo });
  const formatted = Object.entries(screenInfo)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  console.log('🐛 BugReport: Screen info formatted', { length: formatted.length });
  return formatted;
};

// POST /api/bug-report
router.post('/', async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🐛 BugReport [${requestId}]: POST request received`, {
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    ip: req.ip || req.connection.remoteAddress
  });

  try {
    const {
      description,
      steps,
      expectedBehavior,
      actualBehavior,
      additionalInfo,
      userRole,
      userName,
      userEmail,
      consoleErrors,
      browserInfo,
      screenInfo,
      windowInfo,
      url,
      timestamp
    } = req.body;

    console.log(`🐛 BugReport [${requestId}]: Request data received`, {
      hasDescription: !!description,
      hasSteps: !!steps,
      hasExpectedBehavior: !!expectedBehavior,
      hasActualBehavior: !!actualBehavior,
      hasAdditionalInfo: !!additionalInfo,
      userRole,
      userName,
      userEmail,
      consoleErrorsCount: consoleErrors?.length || 0,
      hasBrowserInfo: !!browserInfo,
      hasScreenInfo: !!screenInfo,
      hasWindowInfo: !!windowInfo,
      url,
      timestamp,
      descriptionLength: description?.length || 0,
      stepsLength: steps?.length || 0
    });

    // Validate required fields
    if (!description || !steps) {
      console.log(`🐛 BugReport [${requestId}]: Validation failed - missing required fields`, {
        hasDescription: !!description,
        hasSteps: !!steps
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Description and steps are required' 
      });
    }

    console.log(`🐛 BugReport [${requestId}]: Validation passed, proceeding with email creation`);

    console.log(`🐛 BugReport [${requestId}]: Creating email transporter`);
    const transporter = createTransporter();

    // Create email content
    const emailSubject = `🐛 Bug Report from ${userRole} - ${userName || 'Unknown User'}`;
    console.log(`🐛 BugReport [${requestId}]: Email subject created`, { subject: emailSubject });
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #dc2626; margin-top: 0; display: flex; align-items: center;">
            🐛 Bug Report
          </h1>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #374151;">Report Details</h3>
            <p><strong>User:</strong> ${userName || 'Unknown'} (${userEmail || 'No email'})</p>
            <p><strong>Role:</strong> ${userRole || 'Unknown'}</p>
            <p><strong>URL:</strong> <a href="${url}" target="_blank">${url}</a></p>
            <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">🐛 What went wrong?</h3>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
              <p style="margin: 0; white-space: pre-wrap;">${description}</p>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">📝 Steps to reproduce</h3>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; white-space: pre-wrap;">${steps}</p>
            </div>
          </div>

          ${expectedBehavior ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">✅ Expected behavior</h3>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <p style="margin: 0; white-space: pre-wrap;">${expectedBehavior}</p>
            </div>
          </div>
          ` : ''}

          ${actualBehavior ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">❌ Actual behavior</h3>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
              <p style="margin: 0; white-space: pre-wrap;">${actualBehavior}</p>
            </div>
          </div>
          ` : ''}

          ${additionalInfo ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">ℹ️ Additional information</h3>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #6b7280;">
              <p style="margin: 0; white-space: pre-wrap;">${additionalInfo}</p>
            </div>
          </div>
          ` : ''}

          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">🖥️ Browser Information</h3>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px;">
              <pre style="margin: 0; white-space: pre-wrap;">${formatBrowserInfo(browserInfo)}</pre>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">📱 Screen Information</h3>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px;">
              <pre style="margin: 0; white-space: pre-wrap;">${formatScreenInfo(screenInfo)}</pre>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">🪟 Window Information</h3>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px;">
              <pre style="margin: 0; white-space: pre-wrap;">${formatScreenInfo(windowInfo)}</pre>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">🚨 Console Errors (${consoleErrors?.length || 0})</h3>
            <div style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto;">
              <pre style="margin: 0; white-space: pre-wrap;">${formatConsoleErrors(consoleErrors)}</pre>
            </div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This bug report was automatically generated by Teacher's Aide app.</p>
            <p>Please respond to this email if you need more information from the user.</p>
          </div>
        </div>
      </div>
    `;

    const emailText = `
🐛 Bug Report from ${userRole} - ${userName || 'Unknown User'}

Report Details:
- User: ${userName || 'Unknown'} (${userEmail || 'No email'})
- Role: ${userRole || 'Unknown'}
- URL: ${url}
- Time: ${new Date(timestamp).toLocaleString()}

What went wrong:
${description}

Steps to reproduce:
${steps}

${expectedBehavior ? `Expected behavior:\n${expectedBehavior}\n` : ''}
${actualBehavior ? `Actual behavior:\n${actualBehavior}\n` : ''}
${additionalInfo ? `Additional information:\n${additionalInfo}\n` : ''}

Browser Information:
${formatBrowserInfo(browserInfo)}

Screen Information:
${formatScreenInfo(screenInfo)}

Window Information:
${formatScreenInfo(windowInfo)}

Console Errors (${consoleErrors?.length || 0}):
${formatConsoleErrors(consoleErrors)}

---
This bug report was automatically generated by Teacher's Aide app.
    `;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'teachers.aide.app@gmail.com',
      to: 'teachers.aide.app@gmail.com',
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    };

    console.log(`🐛 BugReport [${requestId}]: Email options prepared`, {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      textLength: mailOptions.text.length,
      htmlLength: mailOptions.html.length
    });

    console.log(`🐛 BugReport [${requestId}]: Attempting to send email`);
    const emailResult = await transporter.sendMail(mailOptions);
    
    console.log(`🐛 BugReport [${requestId}]: Email sent successfully`, {
      messageId: emailResult.messageId,
      response: emailResult.response,
      accepted: emailResult.accepted,
      rejected: emailResult.rejected
    });

    console.log(`🐛 BugReport [${requestId}]: Sending success response to client`);
    res.json({ 
      success: true, 
      message: 'Bug report sent successfully' 
    });

  } catch (error) {
    console.error(`🐛 BugReport [${requestId}]: Error occurred`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      port: error.port,
      timestamp: new Date().toISOString()
    });
    
    const errorResponse = {
      success: false, 
      message: 'Failed to send bug report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    };
    
    console.log(`🐛 BugReport [${requestId}]: Sending error response`, errorResponse);
    res.status(500).json(errorResponse);
  }
});

module.exports = router;