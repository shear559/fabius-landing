# Generated products, served for the live preview

Runtime files of the twelve September 10 artifacts, copied byte for byte from each run's `source.zip` (`index.html`, `styles.css`, `app.js` for the page and app runs; `solution.md`, `solution.py`, `verification.md` for the math runs). Nothing here was edited.

`preview.html` is the entry the page frames. For the landing-page runs it is a byte-identical copy of `index.html` (an entry named `index.html` is redirected to the directory path by the site's clean-URL rule, which would break the pages' relative asset URLs). For the app runs it is the run's `index.html` with one added line: `<script src="../preview-storage.js">` before the first script. The stand-in gives the sandboxed frame an in-memory `localStorage` because a sandboxed frame has an opaque origin where the real one throws. It exists for the on-page preview only; the artifact's own persistence code runs unchanged against it. Boards reset when the frame reloads.

Every response under this path carries a Content-Security-Policy with `sandbox` and `frame-ancestors 'self'` (see `vercel.json`): the files run in an opaque origin, inside this site's frames only, with no network access. The exact original bytes and hashes are in each run's `source.zip` and `runs.json`.
