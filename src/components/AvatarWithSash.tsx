"use client";

interface AvatarWithSashProps {
  imageUrl: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  fallback?: React.ReactNode;
  className?: string;
}

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
  fallback,
  className = "",
}: AvatarWithSashProps) {
  const sizeClass = sizeClasses[size];

  return (
    <div className={`shrink-0 overflow-hidden rounded-full ring-1 ring-stone-200 ${sizeClass} ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-stone-200 text-stone-500 text-[10px]">
          {fallback ?? "?"}
        </div>
      )}
    </div>
  );
}
