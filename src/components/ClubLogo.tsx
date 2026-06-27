type ClubLogoProps = {
  className?: string;
};

/** Intrinsic dimensions match public/logo.png (1650×600). */
const LOGO_WIDTH = 1650;
const LOGO_HEIGHT = 600;

export function ClubLogo({ className = "h-10" }: ClubLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Spencer's Crossing Golf Club"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={`block w-auto max-w-none ${className}`}
    />
  );
}
