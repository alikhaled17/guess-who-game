import { JoinClientPage } from "./JoinClientPage";

/**
 * Static export can't pre-render one file per arbitrary game id, so this
 * builds exactly ONE placeholder page (join/_/index.html). Cloudflare
 * Pages' _redirects then proxies every real /join/<id> request to that
 * same file with a 200 (URL bar keeps showing the real id) — see
 * public/_redirects. The actual id is read client-side from the real URL
 * in JoinClientPage, not from this route's params.
 */
export function generateStaticParams() {
  return [{ gameId: "_" }];
}
export const dynamicParams = false;

export default function JoinPage() {
  return <JoinClientPage />;
}
