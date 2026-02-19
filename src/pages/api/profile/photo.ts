import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "profile");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_SIZE,
      maxFiles: 1,
      allowEmptyFiles: false,
      filter: (part) => {
        return part.mimetype?.startsWith("image/") ?? false;
      },
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { files } = await parseForm(req);
    const file = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    if (!file || !file.filepath) {
      return res.status(400).json({ error: "No file provided" });
    }

    const mimetype = file.mimetype ?? "";
    if (!ALLOWED_TYPES.includes(mimetype)) {
      return res.status(400).json({
        error: "Invalid file type. Use JPEG, PNG, or WebP.",
      });
    }
    if (file.size && file.size > MAX_SIZE) {
      return res.status(400).json({
        error: "File too large. Maximum size is 5MB.",
      });
    }

    const ext = mimetype === "image/jpeg" ? "jpg" : mimetype.split("/")[1] || "jpg";
    const filename = `${session.user.id}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await mkdir(UPLOAD_DIR, { recursive: true });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { imageUrl: true },
    });

    if (user?.imageUrl) {
      const oldPath = path.join(process.cwd(), "public", user.imageUrl);
      try {
        await unlink(oldPath);
      } catch {
        // Ignore if old file doesn't exist
      }
    }

    const fs = await import("fs/promises");
    await fs.copyFile(file.filepath, filepath);

    const imageUrl = `/uploads/profile/${filename}`;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { imageUrl },
    });

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Photo upload failed:", error);
    const message = error instanceof Error ? error.message : "Failed to upload photo";
    return res.status(500).json({
      error: message,
    });
  }
}
