export function memberOriginAllowed(request: Request) {
  const url = new URL(request.url);
  const allowed = [
    "https://app.whatelz.ai",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : "",
  ];
  if (process.env.NODE_ENV === "development")
    allowed.push("http://app.localhost:3109", "http://localhost:3109");
  return (
    allowed.includes(url.origin) && request.headers.get("origin") === url.origin
  );
}
