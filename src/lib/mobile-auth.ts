import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { encode, getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";

/** Same default as NextAuth.js session JWT (30 days). */
export const MOBILE_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

function authSecret(): string | null {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? null;
}

function requireAuthSecret(): string {
  const secret = authSecret();
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return secret;
}

async function sessionFromJwt(token: JWT): Promise<Session | null> {
  const userId = (token.id ?? token.sub) as string | undefined;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      imageUrl: true,
      scgaOfficial: true,
    },
  });
  if (!user) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      role: user.role ?? "member",
      image: user.imageUrl ?? null,
      scgaOfficial: user.scgaOfficial ?? false,
    },
    expires: new Date(Date.now() + MOBILE_TOKEN_MAX_AGE * 1000).toISOString(),
  };
}

async function sessionFromBearer(
  req: NextRequest | NextApiRequest
): Promise<Session | null> {
  const secret = authSecret();
  if (!secret) return null;
  const token = await getToken({ req, secret });
  if (!token || (!token.id && !token.sub)) return null;
  return sessionFromJwt(token);
}

/**
 * Resolves the current user from a Bearer JWT (mobile) or NextAuth cookie session (web).
 * Pass the route handler's request when available so mobile clients can authenticate.
 */
export async function getAuthSession(
  request?: NextRequest
): Promise<Session | null> {
  if (request) {
    const mobileSession = await sessionFromBearer(request);
    if (mobileSession) return mobileSession;
  }

  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  return getServerSession(authOptions);
}

/** For Pages API routes that need both cookie and Bearer auth (e.g. file uploads). */
export async function getAuthSessionFromApiRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<Session | null> {
  const mobileSession = await sessionFromBearer(req);
  if (mobileSession) return mobileSession;

  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  return getServerSession(req, res, authOptions);
}

/** Issue a NextAuth-compatible encrypted JWT for mobile clients. */
export async function createMobileAuthToken(user: {
  id: string;
  email: string;
  role: string;
  name: string;
}): Promise<string> {
  return encode({
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    secret: requireAuthSecret(),
    maxAge: MOBILE_TOKEN_MAX_AGE,
  });
}
