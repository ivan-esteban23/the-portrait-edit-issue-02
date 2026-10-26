/** Shared by static route generation and client navigation. */
export function absolutePageUrl(path: string | undefined, siteUrl: string) {
  if (/^https?:\/\//i.test(path ?? "")) return path!;
  const url = new URL((path ?? "").replace(/^\/+/, ""), siteUrl);
  url.pathname = url.pathname.replace(/\/*$/, "/");
  url.search = "";
  url.hash = "";
  return url.href;
}
export function truncateMetaDescription(text: string, maxLength = 155) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
export function pageStructuredData(
  title: string,
  description: string,
  url: string,
  image: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name: title,
    description,
    image,
    publisher: { "@type": "Organization", name: "The Portrait Edit" },
  };
}
