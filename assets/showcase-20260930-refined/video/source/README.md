# Film source

`scenes/product.js` and `product.css` hold original Lattice UI. `scenes/film.js` evaluates time deterministically. `render-refined.mjs` renders the entire film in one browser/page, then records ffprobe metadata and PNG frame hashes. `write-metadata.mjs` derives VTT files from `../film-data.js`.

See `../README.md` for requirements, exact commands, the localized opacity correction and limits. Temporary stills default to `.render-work/`; set `LATTICE_RENDER_DIR` to choose another scratch directory. No frame directory is created: full film PNGs stream into ffmpeg.
