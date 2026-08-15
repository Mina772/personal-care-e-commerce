import { useEffect } from 'react';

export const Seo = ({ title, description, image, structuredData }: { title: string; description: string; image?: string; structuredData?: unknown }) => {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
      element.content = content;
    };
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', structuredData ? 'product' : 'website');
    setMeta('meta[property="og:url"]', 'property', 'og:url', window.location.href);
    if (image) setMeta('meta[property="og:image"]', 'property', 'og:image', image);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `${window.location.origin}${window.location.pathname}`;
    document.getElementById('wellora-structured-data')?.remove();
    if (structuredData) { const script = document.createElement('script'); script.id = 'wellora-structured-data'; script.type = 'application/ld+json'; script.text = JSON.stringify(structuredData); document.head.appendChild(script); }
  }, [title, description, image, structuredData]);
  return null;
};