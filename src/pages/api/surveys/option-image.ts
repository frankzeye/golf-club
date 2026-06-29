import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthSessionFromApiRequest } from "@/lib/auth";
import { put } from "@vercel/blob";
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

/**
 * POST /api/surveys/option-image - Upload a thumbnail for a multiple choice
 * survey option (admin only). Returns { imageUrl } for use when creating the
 * survey or adding an option.
 */
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
  if (session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const { files } = await parseForm(req);
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
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
    const pathname = `survey-options/option.${ext}`;

    const buffer = await readFile(file.filepath);
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: mimetype,
      addRandomSuffix: true,
    });

    return res.status(200).json({ imageUrl: blob.url });
  } catch (error) {
    console.error("Survey option image upload failed:", error);
    const message = error instanceof Error ? error.message : "Failed to upload image";
    return res.status(500).json({
      error: message,
    });
  }
}
