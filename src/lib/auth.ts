import type { NextAuthOptions } from "next-auth";
import type { NextRequest } from "next/server";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/mobile-auth";

export { getAuthSession, getAuthSessionFromApiRequest, createMobileAuthToken } from "@/lib/mobile-auth";

async function refreshUserTokenFromDb(token: {
  id?: string;
  role?: string;
  imageUrl?: string | null;
  scgaOfficial?: boolean;
  name?: string | null;
}) {
  if (!token.id) return;

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: {
      role: true,
      imageUrl: true,
      scgaOfficial: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (!user) return;

  token.role = user.role ?? "member";
  token.imageUrl = user.imageUrl ?? null;
  token.scgaOfficial = user.scgaOfficial ?? false;
  token.name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

/** Returns session if user is admin, otherwise returns JSON 403 response. Use in API routes. */
export async function requireAdmin(request?: NextRequest) {
  const session = await getAuthSession(request);
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
          imageUrl: user.imageUrl,
          scgaOfficial: user.scgaOfficial,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.imageUrl = (user as { imageUrl?: string | null }).imageUrl ?? null;
        token.scgaOfficial = (user as { scgaOfficial?: boolean }).scgaOfficial ?? false;
        token.imageLookupDone = Boolean(token.imageUrl);
      }

      if (trigger === "update" && token.id) {
        await refreshUserTokenFromDb(token);
        token.imageLookupDone = true;
      } else if (token.id && !token.imageUrl && !token.imageLookupDone) {
        // Backfill profile photo when JWT was issued before a photo existed.
        await refreshUserTokenFromDb(token);
        token.imageLookupDone = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = (token.role as string) ?? "member";
        (session.user as { image?: string | null }).image =
          (token.imageUrl as string | null) ?? null;
        (session.user as { scgaOfficial?: boolean }).scgaOfficial =
          (token.scgaOfficial as boolean) ?? false;
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
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
