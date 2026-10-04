/**
 * usePageMeta.ts — dynamic <title> and OG meta tags
 *
 * FIX 5: When sharing a listing link, WhatsApp/Telegram show no preview
 * because the page has a static title and no og:image.
 *
 * Call this at the top of ListingDetail:
 *   usePageMeta({
 *     title: `${listing.title} | TerraMap`,
 *     description: `${formatIndianPrice(listing.price)} · ${listing.area} sq ft`,
 *     image: listing.images[0],
 *   });
 *
 * On unmount it restores the default title.
 *
 * NOTE: For full SEO, server-side rendering or a meta-tag proxy (like
 * prerender.io) is needed for crawlers. This hook handles the runtime
 * case — WhatsApp/Telegram fetch the page live so this works for them.
 */
import { useEffect } from "react";

interface PageMeta {
  title: string;
  description?: string;
  image?: string;
  url?: string;
}

function setMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setNameMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.content = content;
}

const DEFAULT_TITLE = "TerraMap — Land Registry Platform";

export function usePageMeta({ title, description, image, url }: PageMeta) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;

    if (description) {
      setMeta("og:description", description);
      setNameMeta("description", description);
    }
    if (image) {
      setMeta("og:image", image);
      setMeta("twitter:image", image);
    }

    setMeta("og:title", title);
    setMeta("og:url", url || window.location.href);
    setMeta("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);

    return () => {
      document.title = prev || DEFAULT_TITLE;
    };
  }, [title, description, image, url]);
}
