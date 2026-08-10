/**
 * AZ Joinery brand lockups.
 *
 * Three approved forms — do not stretch, recolour, or crowd them.
 *   <LogoMark />   the A-Z symbol only (nav rail, app icon, tight spaces)
 *   <LogoFull />   symbol + JOINERY wordmark (login, splash, print)
 *   <BrandLockup />  symbol + typeset name (app header)
 *
 * Clear space: every lockup reserves padding equal to ~25% of its height.
 */

/* eslint-disable @next/next/no-img-element */

export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/logo-mark.png"
      alt="AZ Joinery"
      width={size}
      height={Math.round(size * 0.857)}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}

export function LogoFull({
  size = 120,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/logo.png"
      alt="AZ Joinery"
      width={size}
      height={Math.round(size * 1.19)}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}

/**
 * Header lockup: mark + typeset name. On a dark rail the name sits in white;
 * pass tone="dark" when placing on a light background.
 */
export function BrandLockup({
  tone = "light",
  markSize = 30,
  showTagline = false,
  className = "",
}: {
  tone?: "light" | "dark";
  markSize?: number;
  showTagline?: boolean;
  className?: string;
}) {
  const nameColor = tone === "light" ? "text-white" : "text-ink-900";
  const tagColor = tone === "light" ? "text-white/55" : "text-ink-500";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} />
      <div className="leading-none">
        <div
          className={`font-heading font-semibold tracking-tight ${nameColor}`}
          style={{ fontSize: markSize * 0.55 }}
        >
          AZ Joinery
        </div>
        {showTagline && (
          <div
            className={`mt-1 font-medium uppercase tracking-[0.16em] ${tagColor}`}
            style={{ fontSize: Math.max(9, markSize * 0.27) }}
          >
            Custom Joinery
          </div>
        )}
      </div>
    </div>
  );
}
