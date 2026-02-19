import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    const emailStr = typeof email === "string" ? email.toLowerCase().trim() : "";
    const passwordStr = typeof password === "string" ? password : "";

    if (!emailStr || !passwordStr) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (passwordStr.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: emailStr },
    });
    if (existing) {
      return res.status(400).json({
        error: "An account with this email already exists",
      });
    }

    const hashed = await hash(passwordStr, 12);
    const adminEmails = (process.env.INITIAL_ADMIN_EMAIL ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const role = adminEmails.includes(emailStr) ? "admin" : "member";
    const user = await prisma.user.create({
      data: {
        email: emailStr,
        password: hashed,
        role,
      },
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Sign up failed:", error);
    return res.status(500).json({ error: "Failed to create account" });
  }
}
