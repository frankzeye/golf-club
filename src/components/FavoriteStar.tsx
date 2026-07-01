interface FavoriteStarProps {
  isFavorite: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}

export function FavoriteStar({
  isFavorite,
  disabled = false,
  onToggle,
  label,
  className = "",
}: FavoriteStarProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      disabled={disabled}
      aria-label={isFavorite ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      aria-pressed={isFavorite}
      className={`rounded-full p-1.5 transition-colors hover:bg-amber-50 disabled:opacity-50 ${className}`}
    >
      <svg
        className={`h-5 w-5 ${isFavorite ? "fill-amber-400 text-amber-400" : "fill-none text-stone-300 hover:text-amber-300"}`}
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 00.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    </button>
  );
}
