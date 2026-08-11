import type { MetadataRoute } from "next";

/**
 * app.azjoinery.com.au is an internal business tool — none of it should be
 * indexed. This is deliberately scoped to this subdomain only and has no
 * bearing on azjoinery.com.au, which is a separate WordPress site with its
 * own robots.txt and must keep its search rankings.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
