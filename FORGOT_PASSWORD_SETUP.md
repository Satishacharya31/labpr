# Forgot Password Feature - Setup Guide

## Overview
A complete forgot password system has been implemented that allows ANY user (not just admins) to reset their password if forgotten.

## What's Been Added

### 1. **Prisma Schema Update** (`prisma/schema.prisma`)
- Added `PasswordResetToken` model for storing password reset tokens
- Added relation to `User` model: `passwordResetTokens PasswordResetToken[]`

### 2. **API Endpoints**

#### `/api/auth/forgot-password.ts`
- **Method**: POST
- **Request**: `{ email: string }`
- **Response**: Success message (doesn't reveal if email exists for security)
- **Functionality**: 
  - Finds user by email
  - Generates secure reset token (expires in 1 hour)
  - Sends email with reset link
  - Invalidates previous unused tokens

#### `/api/auth/reset-password.ts`
- **Method**: POST
- **Request**: `{ token: string, password: string }`
- **Functionality**:
  - Validates token (checks expiration, usage, format)
  - Hashes new password using bcryptjs
  - Updates user password in database
  - Marks token as used

### 3. **Frontend Pages**

#### `/pages/auth/forgot-password.tsx`
- User enters email address
- Shows confirmation message
- Styled form with validation
- Links to login and signup

#### `/pages/auth/reset-password.tsx`
- Token validation on page load
- Password input fields with strength requirements (min 8 chars)
- Show/hide password toggle
- Success confirmation with auto-redirect to login
- Error handling for invalid/expired tokens

### 4. **Login Page Update**
- Added "Forgot password?" link below password field
- Links to forgot password flow

### 5. **Email Integration**
- Uses Resend email service
- Beautiful HTML email templates
- Reset link expires in 1 hour
- Includes fallback link text if email client doesn't support HTML

## Setup Instructions

### Step 1: Database Migration
Run this command to create the new table:
```bash
npx prisma migrate dev --name add_password_reset_tokens
```

Or if you want just to push the schema:
```bash
npx prisma db push
```

### Step 2: Verify Environment Variables
Ensure these are in your `.env` file:
```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@campuskit.com
NEXTAUTH_URL=https://your-domain.com
```

### Step 3: Get Resend API Key
1. Go to https://resend.com
2. Sign up (free tier: 100 emails/day)
3. Go to API Keys section
4. Copy your API key
5. Add to `.env`: `RESEND_API_KEY=re_xxx`

### Step 4: Test the Flow
1. Go to `/login`
2. Click "Forgot password?"
3. Enter your email address
4. Check email (or test inbox if using Resend test mode)
5. Click reset link
6. Set new password
7. Auto-redirects to login

## User Flow

```
User Forgets Password
         ↓
Clicks "Forgot Password?" on login page
         ↓
Goes to /auth/forgot-password
         ↓
Enters email address
         ↓
API generates secure token (1 hour expiry)
         ↓
Email sent with reset link
         ↓
User clicks link in email
         ↓
Goes to /auth/reset-password?token=xxx
         ↓
User enters new password
         ↓
Password reset, auto-redirect to login
         ↓
User logs in with new password
```

## Key Features

✅ **Secure Tokens**: Random 32-byte hex tokens
✅ **Token Expiration**: 1 hour expiration time
✅ **Single Use**: Tokens can only be used once
✅ **Email Confirmation**: Beautiful HTML emails
✅ **Password Requirements**: Minimum 8 characters
✅ **Safe Email Lookup**: Doesn't reveal if email exists
✅ **Error Handling**: Proper error messages
✅ **Auto-Redirect**: Redirects to login after success
✅ **Show/Hide Password**: Toggle password visibility

## Email Template Features

The email includes:
- User name (if available)
- Large action button for clicking
- Fallback plain text link
- 1-hour expiration notice
- Security warning if not requested

## Admin Password Reset (Unchanged)

Admins can still reset user passwords from the admin panel:
- Go to Admin → User Management
- Click "Reset Password" button next to user
- Enter new password
- Sends password via email to user

## Differences: User vs Admin Password Reset

| Feature | User Reset | Admin Reset |
|---------|-----------|------------|
| Who initiates | User | Admin |
| Authentication | None | Admin login required |
| Token expiry | 1 hour | N/A (admin chosen) |
| Email sent | Yes | Yes |
| Password visibility | Hidden during setup | Admin enters password |

## Security Considerations

1. **Tokens are secure**: Generated using `crypto.randomBytes(32)`
2. **One-time use**: Tokens marked as used after reset
3. **Short expiration**: 1 hour window for security
4. **Database indexed**: Token lookup is optimized
5. **No email enumeration**: Doesn't reveal if email exists
6. **Password hashed**: Using bcryptjs with salt=10
7. **HTTPS only**: URLs must use HTTPS in production

## Troubleshooting

### Email not sending?
- Check `RESEND_API_KEY` is valid
- Check `RESEND_FROM_EMAIL` is correct
- Check Resend account has credits
- Check email is whitelisted (in dev mode)

### Token errors?
- Make sure database migration ran: `npx prisma migrate dev`
- Check token hasn't expired (1 hour window)
- Check token hasn't already been used

### Password not updating?
- Ensure password is at least 8 characters
- Check user exists in database
- Check no database connection errors

## Next Steps

1. Run database migration
2. Set up Resend API key
3. Test forgot password flow
4. Test admin password reset
5. Deploy to production
