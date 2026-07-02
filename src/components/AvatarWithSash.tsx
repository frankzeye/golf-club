"use client";

import { useState, useEffect } from "react";

interface AvatarWithSashProps {
  imageUrl: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  fill?: boolean;
  fallback?: React.ReactNode;
  className?: string;
}

const sizePx = {
  sm: 28,
  md: 32,
  lg: 48,
  xl: 56,
  "2xl": 96,
} as const;

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-14 w-14",
  "2xl": "h-24 w-24",
};

export function AvatarWithSash({
  imageUrl,
  alt,
  size = "md",
  fill = false,
  fallback,
  className = "",
}: AvatarWithSashProps) {
  const px = sizePx[size];
  const sizeClass = fill ? "h-full w-full" : sizeClasses[size];
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full ring-1 ring-stone-200 ${sizeClass} ${className}`}
      style={
        fill
          ? undefined
          : { width: px, height: px, minWidth: px, maxWidth: px }
      }
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={alt}
          width={px}
          height={px}
          className="block h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-stone-200 text-[10px] text-stone-500">
          {fallback ?? "?"}
        </div>
      )}
    </div>
  );
}
