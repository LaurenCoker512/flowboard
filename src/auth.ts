import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/db';
import { passwordResetTokens, users } from '@/db/schema';
import { eq, isNotNull, lt, or } from 'drizzle-orm';
import { authConfig } from '@/auth.config';

export class InvalidCredentialsError extends CredentialsSignin {
  code = 'invalid_credentials';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== 'string' || typeof password !== 'string') {
          throw new InvalidCredentialsError();
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) throw new InvalidCredentialsError();

        const valid = await compare(password, user.passwordHash);
        if (!valid) throw new InvalidCredentialsError();

        void db
          .delete(passwordResetTokens)
          .where(or(lt(passwordResetTokens.expiresAt, new Date()), isNotNull(passwordResetTokens.usedAt)))
          .catch(() => {});

        return { id: user.id, name: user.username, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
