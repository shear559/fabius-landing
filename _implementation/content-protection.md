# Fabius landing: design and content protection

Owner request, 2026-10-24: apply Averya's anti-copy approach to the Fabius website.

The trust boundary is the public request to the deployment. The assets are the site's copy, runtime CSS/JS, fonts and artwork. The intended controls deter identifiable scraping and prevent another website from embedding runtime assets directly. They do not make a public website confidential.

## Implementation

- Two additive `vercel.json` mitigation routes deny the named AI/scraping agents mirrored from Averya and cross-site browser subresource requests. Both leave normal navigation and same-origin loading alone. Crawler policy and sitemap remain retrievable.
- `Cross-Origin-Resource-Policy: same-origin`, consistent CORS and asset `X-Robots-Tag: noindex` supplement the existing CSP and frame denial.
- `.vercelignore` excludes internal documentation/checks, the local responsive fixture, source maps and archived showcase sources. Sources remain in Git. No current public page references these archives.
- No selection/context-menu blocking, DevTools detection, tracking or visual changes. Installation copy controls retain their original behavior.

The Vercel account API returned `Seawall Config not found` for reads and a scoped PATCH. Automatic approval review rejected a whole-firewall PUT because existing rules could not be verified and preserved. No account firewall configuration was replaced. The deployment routes are an additive alternative, versioned and reversible with the website; they are a maintained user-agent list, not Vercel's managed AI-bot classification.

## Limits

User agents and Fetch Metadata can be spoofed by non-browser clients. Visible content and browser-delivered assets can be saved. `shear559/fabius-landing` is public; the source remains readable through GitHub. Repository visibility was not changed. Conventional search agents and social preview fetches are intentionally allowed.

## Verification and rollback

Run `node --test _checks/protection.test.mjs`. Set `PROTECTION_BASE_URL` to the deployed origin for real HTTP status/header checks. Verify the canonical page, images, motion control, install tabs and command copying in a browser after deployment. Roll back the website commit normally if needed; no account firewall rollback is required.

Sources checked on 2026-10-24:
- Averya's `_implementation/asset-protection/PROTECTION.md` and current `robots.txt`/`vercel.json`.
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/changelog/web-application-firewall-control-now-available-with-vercel-json

Verified on 2026-10-24 by Codex:
- Deployment `dpl_BnNFDRi25G8zSnTAcAkn7mBzDRqw`, production, READY, source commit `c0b97bb5354a360d2b6790427a47ce63d6765bf2`; canonical alias confirmed.
- All five Node tests passed, including ten live HTTP cases. Cross-site CSS embedding and GPTBot returned 403; normal navigation, same-origin CSS, top-level CSS navigation, Googlebot, crawler policy and the PDF returned 200. README and the internal preview returned 404. CORP/noindex response headers matched.
- Chrome at 1363px: 47 images, zero broken images, fonts loaded, no horizontal overflow. Claude Code and general setup tabs rendered; their copy controls reported success. Pause/resume synchronized across motion controls and was restored to its original state. No application console errors; only browser-extension metadata errors appeared.
- All twelve existing content/design/interaction/PDF source files were byte-identical to the previous release.
- Not verified: physical mobile devices and clipboard contents outside the browser. The clipboard adapter returned an empty value despite the page's success status; only the UI success state is claimed. Spoofed/unknown automation is outside the protection claim.
