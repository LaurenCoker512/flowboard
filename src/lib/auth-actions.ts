'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

export async function loginAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    await signIn('credentials', {
      username: formData.get('username'),
      password: formData.get('password'),
      redirectTo: '/board',
    });
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      return 'Invalid username or password.';
    }
    throw err;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
