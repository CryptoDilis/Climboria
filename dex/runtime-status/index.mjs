const statusPath = "/swap-runtime-status.json";
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (url.origin !== "https://climboria.fun" || url.pathname !== statusPath) {
      return new Response(null, { status: 404, headers });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
    }
    return new Response(request.method === "HEAD" ? null : '{"enabled":false}', { headers });
  }
};
