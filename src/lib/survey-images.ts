import { del } from "@vercel/blob";

function isBlobUrl(url: string): boolean {
  return url.startsWith("http") && url.includes("blob.vercel-storage.com");
}

/** Best-effort deletion of uploaded option thumbnails when options/surveys are removed. */
export async function deleteSurveyOptionImages(
  urls: Array<string | null | undefined>
): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await Promise.all(
    urls
      .filter((u): u is string => !!u && isBlobUrl(u))
      .map(async (u) => {
        try {
          await del(u);
        } catch {
          // Ignore if blob no longer exists
        }
      })
  );
}
