import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

/** Returns session if user is admin, otherwise returns JSON 403 response. Use in API routes. */
export async function requireAdmin() {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, error: { json: { error: "Unauthorized" }, status: 401 } as const };
  }
  if (session.user.role !== "admin") {
    return { session: null, error: { json: { error: "Admin access required" }, status: 403 } as const };
  }
  return { session, error: null };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;
        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
        let role = token.role as string | undefined;
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, imageUrl: true, scgaOfficial: true },
        });
        if (u) {
          if (!role) {
            role = u.role ?? "member";
            token.role = role;
          }
          (session.user as { image?: string | null }).image = u.imageUrl ?? null;
          (session.user as { scgaOfficial?: boolean }).scgaOfficial = u.scgaOfficial ?? false;
        }
        (session.user as { role?: string }).role = role ?? "member";
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
