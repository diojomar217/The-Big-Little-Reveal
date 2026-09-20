import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV !== "production" ? "local-preview-auth-secret" : undefined),
  providers: [Google({ clientId: process.env.AUTH_GOOGLE_ID || "not-configured", clientSecret: process.env.AUTH_GOOGLE_SECRET || "not-configured" })],
  pages: { signIn: "/" },
  callbacks: {
    authorized: async ({ auth: session }) => !!session?.user?.email,
  },
});
