// Helper to build per-route head() overrides consistent across modules.
// Usage:
//   head: () => pageHead({ title: "Buku Besar — Finance", description: "..." })
const BASE = "https://prime-health-suite.lovable.app";

export function pageHead(opts: {
  title: string;
  description: string;
  path?: string;
}) {
  const { title, description, path } = opts;
  const url = path ? `${BASE}${path}` : undefined;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...(url ? [{ property: "og:url", content: url }] : []),
    ],
    ...(url ? { links: [{ rel: "canonical", href: url }] } : {}),
  };
}
