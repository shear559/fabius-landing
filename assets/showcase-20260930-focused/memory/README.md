# Continuum — a working project-memory example

Open index.html through a static HTTP server. Ask a question, follow a cited record, inspect a superseded decision, save a new decision and retrieve it. Download a Markdown context brief to keep the result. No dependencies or model connection.

The eight initial records are authored fiction for a Luma reading workspace. The browser keeps edits in this preview only; it does not access your files or claim persistence across real sessions. Source paths, line labels and dates belong to the fictional record set. No relevance score is a confidence score.

Fabius contribution: Archivum's selected-source retrieval, provenance, preserved decision history and record-before-work method. The BM25 formula in model.mjs adapts the original Fabius helper at skills/fabius-archivum/scripts/retrieval.mjs (source release 3.3.0, ce34f26). This UI adds explicit current-project filtering and authored supersession metadata. It does not implement the helper's filesystem, hash or stale-index checks, since it reads a fixed in-memory dataset. It is an authored demonstration, not a controlled model-comparison result.

Checks: `node verify.mjs`. Every selected record is checked against the actual source object; excluded records remain excluded even when their text strongly matches. Mutation, query normalization, empty results, source citations, write bounds and immediate recall are covered.

Graph edges connect the selected project's record to visible entries. Filled nodes are selected for the current question; a dashed node marks the superseded proposal. A compact selection diagram shows selected records versus all records, not token savings or a performance measurement.
