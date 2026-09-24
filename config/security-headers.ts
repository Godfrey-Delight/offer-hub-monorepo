type Header = { key: string; value: string };

const isProduction = process.env.NODE_ENV === "production";

function parseOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function uniqueOrigins(origins: (string | null | undefined)[]): string[] {
  return [...new Set(origins.filter((o): o is string => Boolean(o)))];
}

/**
 * Builds a pragmatic CSP for Next.js App Router:
 * - Blocks third-party scripts (script-src 'self')
 * - Allows inline scripts/styles required by Next.js hydration and React
 */
export function buildContentSecurityPolicy(): string {
  const connectOrigins = uniqueOrigins([
    parseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL),
    parseOrigin(process.env.NEXT_PUBLIC_API_BASE_URL),
    parseOrigin(process.env.NEXT_PUBLIC_API_URL),
    parseOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    "https://*.supabase.co",
    "https://ipapi.co",
    "https://api.github.com",
  ]);

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${connectOrigins.join(" ")}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function getSecurityHeaders(): Header[] {
  const cspHeaderName = isProduction
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

  const headers: Header[] = [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: cspHeaderName, value: buildContentSecurityPolicy() },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
