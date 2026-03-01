import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: EmailParams) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@campuskit.com',
      to,
      subject,
      html,
      replyTo,
    });

    if (result.error) {
      console.error('Failed to send email:', result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function getPasswordSetupEmail(userName: string, setupLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; }
          .header { color: #333; margin-bottom: 20px; }
          .button { background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">Setup Your Password</h1>
          <p>Hi ${userName || 'there'},</p>
          <p>An admin has invited you to Campus Kit. Click the link below to set up your password:</p>
          <a href="${setupLink}" class="button">Setup Password</a>
          <p>Or copy this link: <br/><code>${setupLink}</code></p>
          <p>This link expires in 24 hours.</p>
          <div class="footer">
            <p>If you didn't request this, you can ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getPasswordResetEmail(userName: string, tempPassword: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; }
          .header { color: #333; margin-bottom: 20px; }
          .password-box { background-color: #f9f9f9; border: 2px solid #8b5cf6; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #8b5cf6; }
          .warning { color: #d97706; background-color: #fef3c7; padding: 12px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #d97706; }
          .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">Your Password Has Been Reset</h1>
          <p>Hi ${userName || 'there'},</p>
          <p>An admin has reset your password. Here's your temporary password:</p>
          <div class="password-box">
            <p style="margin: 0; color: #666;">Temporary Password:</p>
            <div class="password">${tempPassword}</div>
          </div>
          <div class="warning">
            <strong>⚠️ Important:</strong> Please change this password immediately after logging in for security.
          </div>
          <p>You can now log in to your account with this temporary password.</p>
          <div class="footer">
            <p>If you didn't request a password reset, contact your admin immediately.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
