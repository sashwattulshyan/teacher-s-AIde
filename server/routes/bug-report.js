const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Create transporter for sending emails
const createTransporter = () => {
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'teachers.aide.app@gmail.com',
      pass: process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD
    }
  };
  
  return nodemailer.createTransport(emailConfig);
};

// POST /api/bug-report
router.post('/', async (req, res) => {
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
      userAgent,
      url,
      timestamp
    } = req.body;

    // Validate required fields
    if (!description || !steps) {
      return res.status(400).json({ 
        success: false, 
        message: 'Description and steps are required' 
      });
    }

    // Check if email credentials are configured
    const hasEmailConfig = process.env.EMAIL_USER && (process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD);
    
    if (!hasEmailConfig) {
      console.log('Email not configured, logging bug report to console instead');
      console.log('🐛 BUG REPORT:', {
        description,
        steps,
        expectedBehavior,
        actualBehavior,
        additionalInfo,
        userRole,
        userName,
        userEmail,
        userAgent,
        url,
        timestamp
      });
      
      return res.json({ 
        success: true, 
        message: 'Bug report logged successfully (email not configured)' 
      });
    }

    const transporter = createTransporter();

    // Create email content
    const emailSubject = `🐛 Bug Report from ${userRole} - ${userName || 'Unknown User'}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">🐛 Bug Report</h1>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3>Report Details</h3>
          <p><strong>User:</strong> ${userName || 'Unknown'} (${userEmail || 'No email'})</p>
          <p><strong>Role:</strong> ${userRole || 'Unknown'}</p>
          <p><strong>URL:</strong> <a href="${url}">${url}</a></p>
          <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>🐛 What went wrong?</h3>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
            <p style="white-space: pre-wrap;">${description}</p>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>📝 Steps to reproduce</h3>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px;">
            <p style="white-space: pre-wrap;">${steps}</p>
          </div>
        </div>

        ${expectedBehavior ? `
        <div style="margin-bottom: 20px;">
          <h3>✅ Expected behavior</h3>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
            <p style="white-space: pre-wrap;">${expectedBehavior}</p>
          </div>
        </div>
        ` : ''}

        ${actualBehavior ? `
        <div style="margin-bottom: 20px;">
          <h3>❌ Actual behavior</h3>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
            <p style="white-space: pre-wrap;">${actualBehavior}</p>
          </div>
        </div>
        ` : ''}

        ${additionalInfo ? `
        <div style="margin-bottom: 20px;">
          <h3>ℹ️ Additional information</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <p style="white-space: pre-wrap;">${additionalInfo}</p>
          </div>
        </div>
        ` : ''}

        <div style="margin-bottom: 20px;">
          <h3>🖥️ Browser Information</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px;">
            <p style="white-space: pre-wrap;">${userAgent}</p>
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
${userAgent}
    `;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'teachers.aide.app@gmail.com',
      to: 'teachers.aide.app@gmail.com',
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      message: 'Bug report sent successfully' 
    });

  } catch (error) {
    console.error('Error sending bug report:', error);
    res.status(500).json({
      success: false, 
      message: 'Failed to send bug report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Test endpoint for email configuration
router.get('/test-email', async (req, res) => {
  try {
    const transporter = createTransporter();
    
    const testMailOptions = {
      from: process.env.EMAIL_USER || 'teachers.aide.app@gmail.com',
      to: 'teachers.aide.app@gmail.com',
      subject: '🐛 Email Configuration Test',
      text: 'This is a test email to verify email configuration.',
      html: '<h1>Email Configuration Test</h1><p>This is a test email to verify email configuration.</p>'
    };
    
    const result = await transporter.sendMail(testMailOptions);
    
    res.json({
      success: true,
      message: 'Email configuration test successful',
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Email configuration test failed',
      error: error.message
    });
  }
});

module.exports = router;