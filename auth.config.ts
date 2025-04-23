// auth.config.ts
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) return isLoggedIn;
      else if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl));
      return true;
    },
  },
  providers: [], // sẽ được gộp trong auth.ts
} satisfies NextAuthConfig;
