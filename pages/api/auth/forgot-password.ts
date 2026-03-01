import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail, getPasswordResetEmail } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      // For security, don't reveal if email exists
      return res.status(200).json({
        message: 'If an account exists with this email, you will receive a password reset link',
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Invalidate any existing reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: { used: true },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Generate reset link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

    // Send password reset email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; }
            .header { color: #333; margin-bottom: 20px; }
            .button { background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .code { background-color: #f9f9f9; padding: 12px; border-radius: 4px; font-family: monospace; word-break: break-all; }
            .warning { color: #d97706; background-color: #fef3c7; padding: 12px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #d97706; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="header">Password Reset Request</h1>
            <p>Hi ${user.name || 'there'},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p>Or copy this link:</p>
            <div class="code">${resetLink}</div>
            <div class="warning">
              <strong>⚠️ Important:</strong> This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </div>
            <div class="footer">
              <p>Link expires at: ${expiresAt.toLocaleString()}</p>
              <p>If you need help, please contact support.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password',
      html: emailHtml,
    }).catch((err) => {
      console.error('Failed to send reset email:', err);
      // Don't fail the request if email fails
    });

    return res.status(200).json({
      message: 'If an account exists with this email, you will receive a password reset link',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
