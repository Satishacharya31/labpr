import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { getNeonAuthService } from '@/lib/neon-auth';
import { Adapter } from 'next-auth/adapters';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true, // Allow linking existing accounts
    }),
    CredentialsProvider({
      id: 'neon-auth',
      name: 'Neon Database Auth',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const neonAuth = getNeonAuthService()

        try {
          // Use Neon authentication service
          const neonUser = await neonAuth.authenticateUser(credentials.email, credentials.password)

          if (!neonUser) {
            throw new Error('Invalid credentials');
          }

          // Check if user has admin role for admin access
          if (neonUser.role !== 'ADMIN') {
            throw new Error('Admin access required');
          }

          return {
            id: neonUser.id,
            email: neonUser.email,
            name: neonUser.name,
            image: null,
            neonRole: neonUser.databaseRole,
            permissions: neonUser.permissions
          };
        } catch (error) {
          console.error('Neon auth error:', error)
          throw error
        } finally {
          await neonAuth.disconnect()
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Dynamic import bcrypt to avoid issues when not installed
          const bcrypt = await import('bcryptjs');

          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user || !user.password) {
            throw new Error('Invalid credentials');
          }

          // Check password
          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!passwordMatch) {
            throw new Error('Invalid credentials');
          }

          // Check if user has admin role
          if (user.role !== 'ADMIN') {
            throw new Error('Admin access required');
          }

          // Check if user is in admin whitelist
          const adminEntry = await prisma.adminWhitelist.findUnique({
            where: { email: credentials.email }
          });

          if (!adminEntry || !adminEntry.isActive) {
            throw new Error('Admin access not authorized');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          if (error instanceof Error && error.message.includes('Cannot resolve module')) {
            throw new Error('Password authentication not available. Please install dependencies.');
          }
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in - allow ALL users to sign in
      if (account?.provider === 'google' && user.email) {
        // Check if user is in admin whitelist
        const adminEntry = await prisma.adminWhitelist.findUnique({
          where: { email: user.email }
        });

        // Determine role: ADMIN if in active whitelist, USER otherwise
        const isAdmin = adminEntry?.isActive ?? false;
        const userRole = isAdmin ? 'ADMIN' : 'USER';

        // Create/update user record in our database
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            image: user.image,
            role: userRole
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            role: userRole
          }
        });

        // Create Neon database user for ALL users with proper role
        try {
          const neonAuth = getNeonAuthService();
          const existingNeonUser = await neonAuth.authenticateUser(user.email);
          if (!existingNeonUser) {
            // Create user with appropriate role: ADMIN or USER
            await neonAuth.createUser(user.email, user.name || undefined, userRole as 'ADMIN' | 'USER');
            console.log(`Created Neon user for ${user.email} with role: ${userRole}`);
          }
          await neonAuth.disconnect();
        } catch (error) {
          console.error('Error creating Neon user for Google account:', error);
          // Continue anyway - Google auth will still work
        }

        // Allow ALL users to sign in
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (token.email) {
        // Get user data to check role
        const userData = await prisma.user.findUnique({
          where: { email: token.email },
        });

        // Get admin whitelist entry
        const adminEntry = await prisma.adminWhitelist.findUnique({
          where: { email: token.email },
        });

        // User is admin if they have ADMIN role AND are in the active whitelist
        const hasAdminRole = userData?.role === 'ADMIN';
        const isInActiveWhitelist = adminEntry?.isActive ?? false;

        token.isAdmin = hasAdminRole && isInActiveWhitelist;
        token.canManageUsers = token.isAdmin ? (adminEntry?.canManageUsers ?? false) : false;
        token.canManageContent = token.isAdmin ? (adminEntry?.canManageContent ?? false) : false;
        token.canManageSettings = token.isAdmin ? (adminEntry?.canManageSettings ?? false) : false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).isAdmin = token.isAdmin;
        (session.user as any).canManageUsers = token.canManageUsers;
        (session.user as any).canManageContent = token.canManageContent;
        (session.user as any).canManageSettings = token.canManageSettings;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
