/**
 * AZ Joinery brand lockups.
 *
 * The logo is a dimensional render built for light backgrounds — its charcoal
 * half disappears if you drop it straight onto dark chrome or photography.
 * Dark surfaces therefore use the dedicated light artwork (logo-*-light.png),
 * which reads cleanly on charcoal with no plaque tile. The legacy `plaque`
 * prop is kept as a fallback (standard logo on a light tile) in case a
 * surface ever needs it.
 *
 *   <LogoMark />            symbol, light background
 *   <LogoMark dark />       light symbol, for dark backgrounds / photography
 *   <LogoFull />            symbol + JOINERY wordmark (login, splash, print)
 *   <LogoFull dark />       light full logo, for dark backgrounds
 *   <BrandLockup tone="…" /> symbol + typeset name (app header / rail)
 *
 * Clear space: each lockup reserves padding of ~20% of its height. Never
 * stretch, rotate, or recolour the artwork.
 */

/* eslint-disable @next/next/no-img-element */

const MARK_RATIO = 1; // height / width of logo-mark — now square
const FULL_RATIO = 910 / 709; // height / width of logo.png (with JOINERY text)

export function LogoMark({
  size = 32,
  dark = false,
  plaque = false,
  className = "",
}: {
  size?: number;
  /** Use the light artwork so the mark stays legible on dark surfaces. */
  dark?: boolean;
  /** Legacy fallback: wrap the standard mark in a light tile. */
  plaque?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src={dark ? "/brand/logo-mark-light.png" : "/brand/logo-mark.webp"}
      alt="AZ Joinery"
      width={size}
      height={Math.round(size * MARK_RATIO)}
      className="select-none object-contain"
      draggable={false}
    />
  );

  if (!plaque) return <span className={className}>{img}</span>;

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
  dark = false,
  plaque = false,
  className = "",
}: {
  size?: number;
  /** Use the light artwork for dark backgrounds. */
  dark?: boolean;
  /** Legacy fallback: standard logo on a light tile. */
  plaque?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src={dark ? "/brand/logo-light.png" : "/brand/logo.webp"}
      alt="AZ Joinery"
      width={size}
      height={Math.round(size * FULL_RATIO)}
      className="select-none object-contain"
      draggable={false}
    />
  );

  if (!plaque) return <span className={className}>{img}</span>;

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
 * Header lockup: mark + typeset name. On a dark rail the mark uses the light
 * artwork and the name sits in white; pass tone="dark" for light backgrounds.
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
      <LogoMark size={markSize} dark={onDark} />
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
