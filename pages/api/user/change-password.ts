import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcryptjs from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can change passwords' });
    }

    // POST - Change password
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

            // Hash the new password
            const salt = await bcryptjs.genSalt(10);
            const hashedPassword = await bcryptjs.hash(newPassword, salt);

            // Update user password in database
            const updatedUser = await prisma.user.update({
                where: { id: session.user.id },
                data: { password: hashedPassword },
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            });

            return res.status(200).json({
                message: 'Password changed successfully',
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
