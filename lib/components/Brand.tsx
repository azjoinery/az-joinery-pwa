/**
 * AZ Joinery brand lockups.
 *
 * Artwork: the official dimensional render, supplied as a clean transparent
 * PNG/WebP. The earlier file had a cream drop-shadow halo baked into its
 * semi-transparent pixels, which is why dark surfaces previously needed a light
 * "plaque" tile behind the mark. The current artwork composites correctly on
 * both dark and light, so the plaque is off by default — the mark now sits
 * directly on the surface, which is what the brand guide asks for.
 *
 * `plaque` is retained for the rare case of placing the mark on busy midtone
 * photography, where a tile still helps separation.
 *
 *   <LogoMark />              symbol (square)
 *   <LogoFull />              symbol + JOINERY wordmark (login, splash, print)
 *   <BrandLockup tone="…" />  symbol + typeset name (app header / rail)
 *
 * Clear space: each lockup reserves padding of ~20% of its height. Never
 * stretch, rotate, or recolour the artwork — the sizing below is driven off a
 * single dimension with the other derived, so the ratio can never drift.
 */

/* eslint-disable @next/next/no-img-element */

/** logo-mark is a square crop of the official artwork. */
const MARK_RATIO = 1; // height / width
/** logo is the full lockup, trimmed to its own bounds: 405 x 512. */
const FULL_RATIO = 512 / 405; // height / width

export function LogoMark({
  size = 32,
  plaque = false,
  className = "",
}: {
  size?: number;
  /** Wrap in a light tile. Only needed over busy midtone photography. */
  plaque?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src="/brand/logo-mark.webp?v=2"
      alt="AZ Joinery"
      width={size}
      height={Math.round(size * MARK_RATIO)}
      style={{
        width: size,
        height: Math.round(size * MARK_RATIO),
        objectFit: "contain",
      }}
      className="block max-w-full select-none"
      draggable={false}
    />
  );

  if (!plaque) return <span className={`inline-flex shrink-0 ${className}`}>{img}</span>;

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center justify-center self-start rounded-lg bg-[#F7F7F5] ring-1 ring-black/5 ${className}`}
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
  /** Width in px; height is derived so the artwork can never be squashed. */
  size?: number;
  plaque?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src="/brand/logo.webp?v=2"
      alt="AZ Joinery"
      width={size}
      height={Math.round(size * FULL_RATIO)}
      style={{
        // Rounded: a fractional height puts the artwork on a sub-pixel
        // boundary and the browser resamples it, softening the edges.
        width: size,
        height: Math.round(size * FULL_RATIO),
        objectFit: "contain",
      }}
      className="block max-w-full select-none"
      draggable={false}
    />
  );

  if (!plaque) return <span className={`inline-flex shrink-0 ${className}`}>{img}</span>;

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center justify-center self-start rounded-xl bg-[#F7F7F5] ring-1 ring-black/5 ${className}`}
      style={{ padding: Math.max(10, size * 0.14) }}
    >
      {img}
    </span>
  );
}

/**
 * Header lockup: mark + typeset name. On a dark rail the name sits in white;
 * pass tone="dark" for light backgrounds.
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
      <LogoMark size={markSize} />
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
