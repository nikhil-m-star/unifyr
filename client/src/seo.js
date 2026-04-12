const ORIGIN = 'https://campusunifyr.vercel.app';
const OG_IMAGE = `${ORIGIN}/og-image.png`;

const ROUTE_SEO = {
  '/': {
    title: 'Campus Unifyr — Find Teammates for Hackathons & Events at BMSCE',
    description:
      'Discover live BMSCE campus events, post team recruitments, and connect with the right collaborators for hackathons, competitions, and workshops.',
    robots: 'index, follow, max-snippet:-1, max-image-preview:large',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Campus Unifyr — Home',
      url: 'https://campusunifyr.vercel.app/',
    },
  },
  '/events/active': {
    title: 'Live Campus Events at BMSCE | Campus Unifyr',
    description:
      'Browse all active BMSCE campus events — hackathons, cultural performances, tech competitions, workshops, and more.',
    robots: 'index, follow, max-snippet:-1, max-image-preview:large',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Active Campus Events',
      url: 'https://campusunifyr.vercel.app/events/active',
    },
  },
  '/recommendations': {
    title: 'AI Event Recommendations | Campus Unifyr',
    description:
      'Tell us your interests and get AI-powered shortlists of the best active BMSCE events matched just for you.',
    robots: 'index, follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'AI Event Recommendations',
      url: 'https://campusunifyr.vercel.app/recommendations',
    },
  },
};

const PRIVATE_SEO = {
  title: 'Campus Unifyr',
  description:
    'Campus Unifyr — The campus collaboration platform for BMSCE students.',
  robots: 'noindex, nofollow',
  structuredData: null,
};

const PRIVATE_PREFIXES = [
  '/auth',
  '/manage',
  '/messages',
  '/notifications',
  '/admin',
  '/ready',
];

/* ── helpers ─────────────────────────────────────────────────────── */

function upsertTag(selector, create, setContent) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  setContent(el);
}

function upsertMeta(nameOrProp, value) {
  const isProperty = nameOrProp.startsWith('og:');
  const attr = isProperty ? 'property' : 'name';
  const selector = `meta[${attr}="${nameOrProp}"]`;

  upsertTag(
    selector,
    () => {
      const m = document.createElement('meta');
      m.setAttribute(attr, nameOrProp);
      return m;
    },
    (el) => el.setAttribute('content', value),
  );
}

function upsertCanonical(href) {
  upsertTag(
    'link[rel="canonical"]',
    () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    },
    (el) => el.setAttribute('href', href),
  );
}

function upsertLdJson(data) {
  const id = 'ld-route';
  let el = document.getElementById(id);

  if (!data) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/* ── main export ─────────────────────────────────────────────────── */

export function applySeo(pathname) {
  let config = ROUTE_SEO[pathname];

  if (!config) {
    const isPrivate = PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
    config = isPrivate ? PRIVATE_SEO : ROUTE_SEO['/'];
  }

  const { title, description, robots, structuredData } = config;
  const canonicalUrl = `${ORIGIN}${pathname}`;

  document.title = title;

  upsertCanonical(canonicalUrl);
  upsertMeta('description', description);
  upsertMeta('robots', robots);

  upsertMeta('og:title', title);
  upsertMeta('og:description', description);
  upsertMeta('og:url', canonicalUrl);
  upsertMeta('og:image', OG_IMAGE);

  upsertMeta('twitter:title', title);
  upsertMeta('twitter:description', description);
  upsertMeta('twitter:image', OG_IMAGE);

  upsertLdJson(structuredData);
}
