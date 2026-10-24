import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// 1. Reader: /issues/:slug/pages/:page
// 2. Study detail: /prompts/:id
// 3. Archive: /prompts
// 4. Issue Overview: /issues/:slug
// 5. About: /about
// 6. Home: /
type PageMetaOptions = {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  preserveScroll?: boolean;
};

type DefaultMeta = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  canonical: string;
};

let defaultMeta: DefaultMeta | undefined;

function metaElement(attribute: "name" | "property", value: string) {
  let element = document.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${value}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.append(element);
  }
  return element;
}

function canonicalElement() {
  let element = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.append(element);
  }
  return element;
}

function readDefaultMeta(): DefaultMeta {
  const description = metaElement("name", "description");
  const ogTitle = metaElement("property", "og:title");
  const ogDescription = metaElement("property", "og:description");
  const ogImage = metaElement("property", "og:image");
  const ogUrl = metaElement("property", "og:url");
  const canonical = canonicalElement();
  const defaultOgUrl = new URL(ogUrl.content || "/", window.location.href).href;

  return {
    title: document.title,
    description: description.content,
    ogTitle: ogTitle.content,
    ogDescription: ogDescription.content,
    ogImage: ogImage.content,
    ogUrl: defaultOgUrl,
    canonical: new URL(canonical.href || defaultOgUrl, window.location.href)
      .href,
  };
}

function absoluteImageUrl(image: string) {
  return new URL(image, window.location.href).href;
}

function absolutePageUrl(path: string | undefined, defaultUrl: string) {
  if (!path) return defaultUrl;
  if (/^https?:\/\//i.test(path)) return path;
  const baseUrl = defaultUrl.endsWith("/") ? defaultUrl : `${defaultUrl}/`;
  return new URL(path.replace(/^\/+/, ""), baseUrl).href;
}

export function truncateMetaDescription(text: string, maxLength = 155) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function usePageMeta({
  title,
  description,
  image,
  path,
  preserveScroll = false,
}: PageMetaOptions) {
  const location = useLocation();

  useEffect(() => {
    const defaults = (defaultMeta ??= readDefaultMeta());
    const descriptionMeta = metaElement("name", "description");
    const ogTitleMeta = metaElement("property", "og:title");
    const ogDescriptionMeta = metaElement("property", "og:description");
    const ogImageMeta = metaElement("property", "og:image");
    const ogUrlMeta = metaElement("property", "og:url");
    const canonical = canonicalElement();
    const pageDescription = description ?? defaults.description;
    const pageUrl = absolutePageUrl(path, defaults.ogUrl);

    document.title = title;
    descriptionMeta.content = pageDescription;
    ogTitleMeta.content = title;
    ogDescriptionMeta.content = description ?? defaults.ogDescription;
    ogImageMeta.content = image ? absoluteImageUrl(image) : defaults.ogImage;
    ogUrlMeta.content = pageUrl;
    canonical.href = path ? pageUrl : defaults.canonical;

    // Preserve the original top-of-page navigation behavior for non-reader routes.
    if (!preserveScroll && !location.pathname.includes("/pages/")) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    return () => {
      document.title = defaults.title;
      descriptionMeta.content = defaults.description;
      ogTitleMeta.content = defaults.ogTitle;
      ogDescriptionMeta.content = defaults.ogDescription;
      ogImageMeta.content = defaults.ogImage;
      ogUrlMeta.content = defaults.ogUrl;
      canonical.href = defaults.canonical;
    };
  }, [description, image, location.pathname, path, title, preserveScroll]);
}
