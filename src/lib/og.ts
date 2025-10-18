import ogs from "open-graph-scraper";

/** Fetch Open Graph/Twitter card metadata with sane fallbacks. */
export async function ogScrape(url: string) {
  try {
    const { result } = await ogs({
      url,
      // keep timeouts modest so your API doesn’t hang
      fetchOptions: { timeout: 8000 },
      // follow redirects by default
    });

    const ogImage =
      Array.isArray(result.ogImage) ? result.ogImage[0]?.url
      : (result.ogImage as any)?.url ?? undefined;

    return {
      title:
        (result.ogTitle as string) ??
        (result.twitterTitle as string) ??
        (result.requestUrl as string) ??
        url,
      description:
        (result.ogDescription as string) ??
        (result.twitterDescription as string) ??
        undefined,
      siteName: (result.ogSiteName as string) ?? undefined,
      ogImage,
    };
  } catch {
    // fallback: just return the URL as title
    return { title: url, description: undefined, siteName: undefined, ogImage: undefined };
  }
}
