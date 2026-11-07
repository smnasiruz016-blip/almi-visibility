# almivisibility-pages

AlmiVisibility's own SEO pages (RR-388 A2). The AlmiVisibility app, or autopilot on GitHub Actions, publishes each page to
`visibility-pages/<slug>/index.html` in this repository. Vercel builds this repository by itself on every push (its Git link), so pages go
live with the owner's PC off.

- This project's own address answers `noindex` (the X-Robots-Tag header): Google sees the pages only at `almivisibility.almiworld.com/<slug>`,
  where the main site serves them (its `ALMIVISIBILITY_PAGES_ORIGIN` setting) and lists them in its sitemap.
- Each page's canonical link already points to `almivisibility.almiworld.com`.
- Nothing here holds a secret.
