# Ingersoll Painting LLC — Website

Marketing website for Ingersoll Painting LLC, Hannibal NY.
Built with Astro + Tailwind CSS. Deployed on Cloudflare Pages.

**Live site:** https://ingersollpaintingllc.com

---

## Local Development

```bash
cd ingersoll-site
npm install
npm run dev
# → http://localhost:4321
```

## Build

```bash
npm run build
# Output goes to ./dist/
```

## Project structure

```
ingersoll-site/
├── public/
│   ├── photos/          # Project photos
│   ├── team/            # Team portraits
│   ├── logo.png         # Wide logo (header/footer)
│   ├── logo-square.png  # Square logo (OG image source)
│   └── og-image.jpg     # Social share image
├── src/
│   ├── components/      # Header, Footer, ServiceCard, CtaBand
│   ├── layouts/         # BaseLayout (head, schema, fonts)
│   └── pages/           # index, services, about, our-work, reviews, contact, 404
└── astro.config.mjs
```

## Cloudflare Pages deploy settings

| Setting | Value |
|---------|-------|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `ingersoll-site` |
| Branch | `main` |

## Adding photos

Drop new photos in `public/photos/`, then add an entry to the `photos` array
in `src/pages/our-work.astro`. Commit and push — Cloudflare redeploys automatically.

## Updating reviews

Edit the `reviews` array at the top of `src/pages/reviews.astro`.

## Contact form

Uses Web3Forms (https://web3forms.com). Access key is set in `src/pages/contact.astro`.
