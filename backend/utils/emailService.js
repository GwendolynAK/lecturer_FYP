import sgMail from '@sendgrid/mail';

// Initialize SendGrid when needed
let isSendGridInitialized = false;

const initializeSendGrid = () => {
  if (isSendGridInitialized) return;
  
  const apiKey = process.env.SENDGRID_API_KEY;
  console.log('🔍 Debug - API Key length:', apiKey ? apiKey.length : 'undefined');
  console.log('🔍 Debug - API Key starts with SG.:', apiKey ? apiKey.startsWith('SG.') : 'undefined');
  console.log('🔍 Debug - API Key first 10 chars:', apiKey ? apiKey.substring(0, 10) : 'undefined');

  if (apiKey && apiKey.startsWith('SG.')) {
    sgMail.setApiKey(apiKey);
    console.log('✅ SendGrid API key configured successfully');
    isSendGridInitialized = true;
  } else {
    console.warn('⚠️  SendGrid API key not properly configured. Email functionality will be disabled.');
  }
};

/**
 * Send verification code email
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit verification code
 * @param {string} appName - Application name
 * @returns {Promise<boolean>} - Success status
 */
export const sendVerificationEmail = async (email, code, appName = 'Course Correct') => {
  initializeSendGrid();
  
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDER_EMAIL || 'noreply@yourdomain.com',
        name: appName
      },
      subject: 'Email Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              color: #059669;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .code-container {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background-color: #f3f4f6;
              border-radius: 8px;
            }
            .verification-code {
              font-size: 48px;
              font-weight: bold;
              color: #059669;
              letter-spacing: 8px;
              margin: 10px 0;
            }
            .expiry-notice {
              color: #6b7280;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 5px;
              padding: 10px;
              margin-top: 20px;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${appName}</div>
              <h2 style="color: #059669; margin: 0;">Email Verification</h2>
            </div>
            
            <p>Hello!</p>
            <p>You've requested to verify your email address. Please use the verification code below to complete your registration:</p>
            
            <div class="code-container">
              <div class="verification-code">${code}</div>
            </div>
            
            <div class="expiry-notice">
              ⏰ This code will expire in <strong>10 minutes</strong>
            </div>
            
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request this verification code, please ignore this email. Never share this code with anyone.
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    if (error.response) {
      console.error('SendGrid response body:', error.response.body);
    }
    return false;
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit reset code
 * @param {string} appName - Application name
 * @returns {Promise<boolean>} - Success status
 */
export const sendPasswordResetEmail = async (email, code, appName = 'Course Correct') => {
  initializeSendGrid();
  
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDER_EMAIL || 'noreply@yourdomain.com',
        name: appName
      },
      subject: 'Password Reset Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              color: #059669;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .code-container {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background-color: #f3f4f6;
              border-radius: 8px;
            }
            .reset-code {
              font-size: 48px;
              font-weight: bold;
              color: #059669;
              letter-spacing: 8px;
              margin: 10px 0;
            }
            .expiry-notice {
              color: #6b7280;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 5px;
              padding: 10px;
              margin-top: 20px;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${appName}</div>
              <h2 style="color: #059669; margin: 0;">Password Reset</h2>
            </div>
            
            <p>Hello!</p>
            <p>You've requested to reset your password. Please use the reset code below to create a new password:</p>
            
            <div class="code-container">
              <div class="reset-code">${code}</div>
            </div>
            
            <div class="expiry-notice">
              ⏰ This code will expire in <strong>10 minutes</strong>
            </div>
            
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged. Never share this code with anyone.
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    if (error.response) {
      console.error('SendGrid response body:', error.response.body);
    }
    return false;
  }
};
