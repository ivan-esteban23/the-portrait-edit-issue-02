import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { absolutePageUrl, pageStructuredData } from "../lib/pageMeta";
export { truncateMetaDescription } from "../lib/pageMeta";

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
    const siteUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
      .href;
    const pageUrl = absolutePageUrl(path, siteUrl);

    document.title = title;
    descriptionMeta.content = pageDescription;
    ogTitleMeta.content = title;
    ogDescriptionMeta.content = pageDescription;
    const shareImage =
      image && !image.endsWith("/cover.webp")
        ? absoluteImageUrl(image)
        : new URL("social-card.png", siteUrl).href;
    ogImageMeta.content = shareImage;
    metaElement("name", "twitter:title").content = title;
    metaElement("name", "twitter:description").content = pageDescription;
    metaElement("name", "twitter:image").content = shareImage;
    for (const [key, value] of Object.entries({
      width: "1200",
      height: "630",
    })) {
      const element = metaElement("property", `og:image:${key}`);
      if (shareImage.endsWith("/social-card.png")) element.content = value;
      else element.remove();
    }
    let jsonLd = document.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.type = "application/ld+json";
      document.head.append(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(
      pageStructuredData(title, pageDescription, pageUrl, shareImage),
    );
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
