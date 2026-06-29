import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthSessionFromApiRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { put, del } from "@vercel/blob";
import { readFile } from "fs/promises";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

function isBlobUrl(url: string): boolean {
  return url.startsWith("http") && url.includes("blob.vercel-storage.com");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set");
    return res.status(500).json({
      error: "File upload is not configured. Please add BLOB_READ_WRITE_TOKEN.",
    });
  }

  const session = await getAuthSessionFromApiRequest(req, res);
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
    const pathname = `profile/${session.user.id}.${ext}`;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { imageUrl: true },
    });

    if (user?.imageUrl && isBlobUrl(user.imageUrl)) {
      try {
        await del(user.imageUrl);
      } catch {
        // Ignore if blob no longer exists
      }
    }

    const buffer = await readFile(file.filepath);
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: mimetype,
      addRandomSuffix: true,  // Unique URL per upload avoids browser cache when switching photos
      allowOverwrite: true,
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { imageUrl: blob.url },
    });

    return res.status(200).json({ imageUrl: blob.url });
  } catch (error) {
    console.error("Photo upload failed:", error);
    const message = error instanceof Error ? error.message : "Failed to upload photo";
    return res.status(500).json({
      error: message,
    });
  }
}
