#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * 
 * This script helps test the email configuration for the bug report system.
 * Run this script to verify that your email settings are working correctly.
 * 
 * Usage:
 *   node test-email-config.js
 * 
 * Make sure your .env file has the required email configuration:
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_USER=teachers.aide.app@gmail.com
 *   EMAIL_PASS=your_gmail_app_password
 *   # OR
 *   GMAIL_APP_PASSWORD=your_gmail_app_password
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfiguration() {
  console.log('🐛 Testing Email Configuration...\n');
  
  // Log environment variables
  console.log('Environment Variables:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT_SET');
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT_SET');
  console.log('  EMAIL_USER:', process.env.EMAIL_USER || 'NOT_SET');
  console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT_SET');
  console.log('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '***SET***' : 'NOT_SET');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT_SET');
  console.log('');
  
  // Check required variables
  const requiredVars = ['EMAIL_USER'];
  const passwordVar = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  
  if (!passwordVar) {
    console.error('❌ ERROR: No email password configured!');
    console.error('   Please set either EMAIL_PASS or GMAIL_APP_PASSWORD in your .env file');
    process.exit(1);
  }
  
  console.log('✅ Required environment variables are set\n');
  
  // Create transporter
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'teachers.aide.app@gmail.com',
      pass: passwordVar
    }
  };
  
  console.log('Email Configuration:');
  console.log('  Host:', emailConfig.host);
  console.log('  Port:', emailConfig.port);
  console.log('  Secure:', emailConfig.secure);
  console.log('  User:', emailConfig.auth.user);
  console.log('  Password:', emailConfig.auth.pass ? '***SET***' : 'NOT_SET');
  console.log('');
  
  try {
    console.log('Creating email transporter...');
    const transporter = nodemailer.createTransporter(emailConfig);
    
    console.log('Verifying email transporter...');
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email transporter verification failed:');
          console.error('   Error:', error.message);
          console.error('   Code:', error.code);
          console.error('   Command:', error.command);
          console.error('   Response:', error.response);
          reject(error);
        } else {
          console.log('✅ Email transporter verified successfully!');
          resolve();
        }
      });
    });
    
    console.log('\nSending test email...');
    const testMailOptions = {
      from: process.env.EMAIL_USER || 'teachers.aide.app@gmail.com',
      to: 'teachers.aide.app@gmail.com',
      subject: '🐛 Email Configuration Test',
      text: 'This is a test email to verify email configuration.',
      html: '<h1>Email Configuration Test</h1><p>This is a test email to verify email configuration.</p>'
    };
    
    const result = await transporter.sendMail(testMailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('   Accepted:', result.accepted);
    console.log('   Rejected:', result.rejected);
    console.log('\n🎉 Email configuration is working correctly!');
    
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Command:', error.command);
    console.error('   Response:', error.response);
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('   1. Check that your Gmail app password is correct');
    console.log('   2. Ensure 2-factor authentication is enabled on your Google account');
    console.log('   3. Verify that the app password was generated for "Mail"');
    console.log('   4. Check that your .env file is in the correct location');
    console.log('   5. Make sure the server is running and accessible');
    
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration().catch(console.error);
