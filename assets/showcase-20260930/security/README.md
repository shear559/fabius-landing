# SENTINEL

An offline access-control workbench for a fictional document app. All sessions and documents are synthetic. This is a fixture-policy simulation, not a scanner, an authentication service, or an audit of a real application.

## Use

Serve this directory with a static server and open `index.html`. No installation, network requests, storage, external fonts or dependencies are required. Classic deferred scripts also work in an opaque-origin iframe when the host CSP permits this directory’s script/style origin.

Choose a role and document, adjust session, team, ownership and MFA, then select Read, Edit, Share or Delete. Every control re-evaluates all permissions. Select a matrix cell to inspect another role/action under the same context. Three preset scenarios expose a restricted read denial, an allowed team edit and an MFA-gated deletion. Reset returns to the initial team edit.

## Fixture policy

- Unknown roles, documents, actions, extra/missing fields and non-boolean flags are denied.
- Public reads require no session. All other requests require an authenticated non-Guest session and the document’s team.
- Team reads are available to Viewer, Editor and Admin. Restricted reads require ownership or Admin.
- Editors may edit/share documents they own. Admins may edit/share within their team. Restricted documents cannot be shared.
- Delete requires Admin, same team, authenticated session and MFA. Ownership never grants delete.

These rules are deliberately small and inspectable. Production authorization must run on a trusted server using verified session and resource facts; these controls are user-editable demonstration inputs.

## Threat model

Assets: synthetic document contents, edit/share/delete authority. Boundary: untrusted request context → pure policy decision. Adversary model: a caller with the wrong role, missing session, wrong team, or an incomplete context. Defensive controls: allowlisted input, explicit grants, object/team scope, MFA gate, default deny. There are no credentials, real documents, outbound requests or destructive side effects.

## Visual system

Mode: operate. Structure: compact header → current request and decision boundary → context controls → trace and role matrix → concise policy notes. Mobile shows the result first, then controls; desktop places context beside the result.

| Token role | Use | Never |
| --- | --- | --- |
| Paper / white | Canvas and control surfaces | Decorative gradients on controls |
| Ink | Type, controls and dark permission panel | Unsupported status or scoring claims |
| Emerald | Allowed decisions and permission paths | A second accent or color-only status |
| Muted neutral | Secondary labels, denied states, rules | Low-contrast essential text |
| System sans | All UI text with a restrained fixed scale | Invented brand font dependency |
| Monospace | Fixture IDs and policy identifiers | Long prose |

## Verification

Run `node verify.mjs`, `node --check policy.js`, and `node --check app.js`. The verifier covers fixed allow/deny cases, transitions and all 768 valid input/action combinations. Browser/layout/CSP verification is performed separately by the integrating parent task; no browser result is claimed here.

Files: `policy.js` contains the pure evaluator; `app.js` renders its results; `TOUR.json` maps five visible walkthrough steps. No side effects occur when a permission is allowed.
