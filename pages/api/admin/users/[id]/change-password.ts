import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcryptjs from 'bcryptjs';
import { sendEmail, getPasswordResetEmail } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!session.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
    }

    // Prevent admin from changing their own password through this endpoint
    if (id === session.user.id) {
        return res.status(403).json({ error: 'Use your profile settings to change your own password' });
    }

    // POST - Change user password
    if (req.method === 'POST') {
        try {
            const { newPassword, confirmPassword } = req.body;

            if (!newPassword || !confirmPassword) {
                return res.status(400).json({ error: 'Password fields are required' });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({ error: 'Passwords do not match' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }

            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id },
                select: { id: true, email: true, name: true },
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Hash the new password
            const salt = await bcryptjs.genSalt(10);
            const hashedPassword = await bcryptjs.hash(newPassword, salt);

            // Update user password in database
            const updatedUser = await prisma.user.update({
                where: { id },
                data: { password: hashedPassword },
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            });

            // Send password reset email
            if (user.email) {
                const emailHtml = getPasswordResetEmail(
                    user.name || user.email,
                    newPassword
                );

                await sendEmail({
                    to: user.email,
                    subject: 'Your Password Has Been Reset',
                    html: emailHtml,
                });
            }

            return res.status(200).json({
                message: 'Password changed successfully and email sent',
                user: updatedUser,
            });
        } catch (error) {
            console.error('Failed to change password:', error);
            return res.status(500).json({ error: 'Failed to change password' });
        }
    }

    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
