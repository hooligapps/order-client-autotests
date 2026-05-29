export function buildAutotestUrl(baseUrl: string, extraQuery?: string): string {
  const url = new URL(baseUrl);

  url.searchParams.set("autotest", "true");

  if (extraQuery) {
    const params = new URLSearchParams(extraQuery);
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}
