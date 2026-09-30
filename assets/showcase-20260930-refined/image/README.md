# Pelagic — Worlds within water

An original biological artwork generated with the built-in image-generation tool on September 30, 2026, presented in a small interactive gallery. It is a creative interpretation of microscopic marine life, not a measured specimen or a laboratory micrograph. Species, organelles and scale must not be inferred from this illustration.

Serve this directory with any static HTTP server and open `index.html`. No build or dependencies. The page loads the artwork directly, even without JavaScript. Select a detail, use the zoom slider, drag the enlarged image, or focus it and use arrow keys. Reset returns the complete composition. The three detail views are crops of the same artwork, not independently generated images.

- `artwork/pelagic-1536.png`: unmodified generated master, 1536 × 1024.
- `artwork/pelagic-1536.webp`: q90 WebP encoding of the master, same resolution.
- `artwork/prompt.txt`: the complete prompt sent to the built-in tool.
- `artwork/creation.json`: creation method, file dimensions and checksums.
- `assets/rubik.woff2` and `assets/OFL.txt`: self-hosted font and license.

Downloads always contain the full image, regardless of the current zoom. No synthetic UI was generated. The viewer is original HTML/CSS/JavaScript; image colors belong to the artwork, with restrained controls around it.

The gallery-only preview wrapper and tour bridge are excluded from the portable source archive. Prior Lattice artwork files remain in the repository's history and historical directories; they are not part of this portable edition.
