/**
 * AZ Joinery brand lockups.
 *
 * The logo is a dimensional render built for light backgrounds — its charcoal
 * half disappears if you drop it straight onto dark chrome or photography.
 * Rather than recolour it (which destroys the bevels), dark surfaces get the
 * mark on a light plaque, the way the real signage reads against a dark wall.
 *
 *   <LogoMark />              symbol, light background
 *   <LogoMark plaque />       symbol on a light tile, for dark backgrounds
 *   <LogoFull />              symbol + JOINERY wordmark (login, splash, print)
 *   <BrandLockup tone="…" />  symbol + typeset name (app header / rail)
 *
 * Clear space: each lockup reserves padding of ~20% of its height. Never
 * stretch, rotate, or recolour the artwork.
 */

/* eslint-disable @next/next/no-img-element */

const MARK_RATIO = 788 / 768; // height / width of logo-mark.png
const FULL_RATIO = 1338 / 1024; // height / width of logo.png

export function LogoMark({
  size = 32,
  plaque = false,
  className = "",
}: {
  size?: number;
  /** Wrap in a light tile so the charcoal half stays legible on dark surfaces. */
  plaque?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src="/brand/logo-mark.webp"
      alt="AZ Joinery"
      width={size}
      height={Math.round(size * MARK_RATIO)}
      className="select-none"
      draggable={false}
    />
  );

  if (!plaque) return <span className={className}>{img}</span>;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-[#F7F7F5] ring-1 ring-black/5 ${className}`}
      style={{ padding: Math.max(4, size * 0.16) }}
    >
      {img}
    </span>
  );
}

export function LogoFull({
  size = 120,
  plaque = false,
  className = "",
}: {
  size?: number;
  plaque?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src="/brand/logo.webp"
      alt="AZ Joinery"
      width={size}
      height={Math.round(size * FULL_RATIO)}
      className="select-none"
      draggable={false}
    />
  );

  if (!plaque) return <span className={className}>{img}</span>;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-[#F7F7F5] ring-1 ring-black/5 ${className}`}
      style={{ padding: Math.max(10, size * 0.14) }}
    >
      {img}
    </span>
  );
}

/**
 * Header lockup: mark + typeset name. On a dark rail the mark gets its plaque
 * and the name sits in white; pass tone="dark" for light backgrounds.
 */
export function BrandLockup({
  tone = "light",
  markSize = 30,
  showTagline = false,
  className = "",
}: {
  /** "light" = placed on a dark surface. "dark" = placed on a light surface. */
  tone?: "light" | "dark";
  markSize?: number;
  showTagline?: boolean;
  className?: string;
}) {
  const onDark = tone === "light";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} plaque={onDark} />
      <div className="leading-none">
        <div
          className={`font-heading font-semibold tracking-tight ${
            onDark ? "text-white" : "text-ink-900"
          }`}
          style={{ fontSize: markSize * 0.55 }}
        >
          AZ Joinery
        </div>
        {showTagline && (
          <div
            className={`mt-1 font-medium uppercase tracking-[0.16em] ${
              onDark ? "text-white/55" : "text-ink-500"
            }`}
            style={{ fontSize: Math.max(9, markSize * 0.27) }}
          >
            Custom Joinery
          </div>
        )}
      </div>
    </div>
  );
}
