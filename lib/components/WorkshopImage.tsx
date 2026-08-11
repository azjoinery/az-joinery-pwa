/**
 * Art-directed workshop photography.
 *
 * NOTE the ?v=2 on every asset URL. next.config.mjs serves images with
 * `max-age=31536000, immutable`, and these files reuse the filenames of the
 * ones they replace — without a changed URL, every browser that already has
 * the old images cached would keep showing them for a year. Bump the version
 * whenever an image is replaced in place.
 *
 * The workshop photo is a wide, deep interior. Shrinking the desktop crop down
 * to a phone throws away the machinery and leaves a grey wall, so each
 * breakpoint gets its own crop of the same frame:
 *
 *   mobile   1080x1920  vertical, bench and CNC in shot
 *   tablet   1600x1200  balanced landscape
 *   desktop  1920x1080  full floor, extraction and panel saw visible
 *   square   1080x1080  narrow columns and mobile headers
 *
 * WebP is offered first with a JPEG fallback. `object-position` is tuned per
 * variant so the focal point (the two benches) survives the crop rather than
 * drifting off-frame.
 *
 * Adding another approved photo later means adding a key here — the components
 * that consume it don't need to change.
 */

/* eslint-disable @next/next/no-img-element */

export type WorkshopVariant = "hero" | "square";

/** Focal point of the frame, so cropping never cuts the benches out. */
const FOCUS = "50% 62%";

export function WorkshopImage({
  variant = "hero",
  className = "",
  priority = false,
  alt = "The AZ Joinery workshop floor in Chipping Norton",
}: {
  variant?: WorkshopVariant;
  className?: string;
  /** Set on the login and dashboard heroes so the image is not lazy-loaded. */
  priority?: boolean;
  alt?: string;
}) {
  if (variant === "square") {
    return (
      <picture className={className}>
        <source srcSet="/workshop/square.webp?v=2" type="image/webp" />
        <img
          src="/workshop/square.jpg?v=2"
          alt={alt}
          className="h-full w-full object-cover"
          style={{ objectPosition: FOCUS }}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
        />
      </picture>
    );
  }

  return (
    <picture className={className}>
      {/* Phones: vertical crop. */}
      <source
        media="(max-width: 767px)"
        srcSet="/workshop/hero-tall.webp?v=2"
        type="image/webp"
      />
      <source media="(max-width: 767px)" srcSet="/workshop/hero-tall.jpg?v=2" />
      {/* Tablets: balanced landscape. */}
      <source
        media="(max-width: 1023px)"
        srcSet="/workshop/hero-tablet.webp?v=2"
        type="image/webp"
      />
      <source media="(max-width: 1023px)" srcSet="/workshop/hero-tablet.jpg?v=2" />
      {/* Desktop: full width of the floor. */}
      <source srcSet="/workshop/hero-wide.webp?v=2" type="image/webp" />
      <img
        src="/workshop/hero-wide.jpg?v=2"
        alt={alt}
        className="h-full w-full object-cover"
        style={{ objectPosition: FOCUS }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}
