'use server';

import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { Resend } from 'resend';
import { generateResetToken, hashToken } from './password-reset';

export type ResetRequestState = {
  status: 'idle' | 'success' | 'error';
  message: string | null;
  resetUrl?: string;
};

export type ResetPasswordState = {
  status: 'idle' | 'success' | 'error';
  message: string | null;
};

export async function requestPasswordResetAction(
  _prevState: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = formData.get('email');
  if (typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: 'Please enter a valid email address.' };
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user) {
    const { raw, hash: tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${raw}`;

    if (process.env.NODE_ENV === 'test') {
      return {
        status: 'success',
        message: "If that email is registered, you'll receive a reset link shortly.",
        resetUrl,
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Flowboard <noreply@flowboard.app>',
      to: email,
      subject: 'Reset your Flowboard password',
      text: `Reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
      html: `<p>Click the link below to reset your Flowboard password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
    });
  }

  return {
    status: 'success',
    message: "If that email is registered, you'll receive a reset link shortly.",
  };
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = formData.get('token');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (
    typeof token !== 'string' ||
    typeof password !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    return { status: 'error', message: 'Invalid request.' };
  }

  if (password !== confirmPassword) {
    return { status: 'error', message: 'Passwords do not match.' };
  }

  if (password.length < 8) {
    return { status: 'error', message: 'Password must be at least 8 characters.' };
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!record) {
    return { status: 'error', message: 'This reset link is invalid or has expired.' };
  }

  const passwordHash = await hash(password, 10);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, record.id));
  });

  return { status: 'success', message: 'Your password has been updated. You can now sign in.' };
}
