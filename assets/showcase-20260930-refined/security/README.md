# SENTINEL — Access review

A local access-control workbench for a fictional document system. Inspect a role grant beside every applicable explicit deny, change the request facts, and see the exact decision trace and receipt. All identities, tenants and documents are synthetic. This is a defensive policy simulation, not a live authorization service or an audit of an application.

## Run

Serve this directory with any static HTTP server and open `index.html`. For example: `python3 -m http.server 8080`. The artifact needs no installation, dependencies, persistence, external fonts or outbound requests. Classic deferred scripts work in opaque-origin gallery frames when the host permits their script/style origin. `preview.html` additionally loads the gallery’s parent-directory bridge; use `index.html` in the standalone source download.

## Explore

The first request is an Admin deleting a Restricted document with a legal hold, an unmanaged device and no MFA. Admin matches a deletion grant, but **all three explicit denies override it**. The counterfactual finds that changing fewer than three facts cannot permit this request. Applying it updates the controls, role matrix, permission deltas, trace and exact JSON receipt together.

Eight presets also cover cross-tenant Admin access, revoked Public reading, owned-document editing, MFA-gated deletion, cross-team access, Restricted sharing and Guest denial. On mobile, open **Request facts** to edit context. Select any permission or role/action matrix cell. Reset returns to the three-deny request.

## Fixture policy v2

- Input must contain exactly the known context attributes, typed values and one known action. Unknown roles, classifications, tenants, device states, extra or missing fields, accessors and unreadable objects fail closed.
- Candidate grants come from the role, action, ownership and classification. No grant is sufficient by itself. No matching grant means denial.
- Explicit denies are evaluated together. In display precedence order: revoked identity, tenant mismatch, deletion under legal hold, Restricted sharing, missing session, Guest scope, team mismatch, unmanaged device, missing deletion MFA. The first deny is the headline; the receipt retains them all.
- Tenant isolation and revocation apply even to Public reads. Here **Public means published within a tenant**, not publicly accessible on the Internet. A valid Public read needs neither a signed-in session nor team membership.
- Other requests require an authenticated non-Guest identity in the same team and tenant. Restricted reads require ownership or Admin. All Restricted access and every write require a managed device.
- Editors may edit/share owned documents. Admins may edit/share within these boundaries. Restricted sharing always denies. Delete requires Admin and MFA and no legal hold; ownership never grants deletion. Holds affect deletion only.

`counterfactual` searches all subsets of eight editable facts in increasing size: session, team, ownership, MFA, device, hold, revocation and actor tenant. Role, action, classification and resource tenant stay fixed. It returns a cardinality-minimum change that flips the decision, with deterministic tie-breaking, or no result if a flip is impossible. This is explanatory, not remediation authority: a user cannot release a real legal hold or change their tenant by requesting it.

## Trust boundary and limitations

The boundary is untrusted request facts → a pure, fail-closed decision. Threat cases include role elevation attempts, cross-tenant object access, revoked identity, unmanaged devices, incomplete inputs and retention bypass. The controls deliberately let a visitor edit facts. Production facts must come from trusted session, tenant, device and resource systems and authorization must run on a trusted server. There are no credentials, network operations, real documents, storage or destructive side effects.

## Verification

```sh
node --check policy.js
node --check app.js
node verify.mjs
```

The September 30 verifier passes 20 fixed policy cases, malformed-input cases, 768 original policy combinations and 24,576 multi-tenant ABAC decisions. It checks explicit-deny precedence, Public tenant isolation, retention scope, managed-device requirements, immutable/deterministic evaluation, and the three-fact minimum repair with every proper subset still denied.

Local browser checks on September 30 passed in Chromium and WebKit at 390 and 1440 CSS pixels (mobile device scale 2): three-deny repair, cross-tenant repair, revoked Public grant, exact request receipt, resource-tenant edit and no horizontal overflow. Screenshots were inspected. This is local rendering and behavior evidence; the deployed host and its CSP were not verified by this package.

## Files and provenance

`policy.js` is the pure evaluator; `app.js` renders evidence from it; `verify.mjs` exercises actual policy behavior; `TOUR.json` contains deterministic visible gallery actions. `index.html` and `preview.html` differ only by the gallery bridge. The standalone `source.zip` includes the runnable page, styles, model, controller, verifier, this README and tour.

Refined on 2026-09-30 with Fabius Decor, Disciplina and Praesidium. This refinement extends the policy itself with tenant/resource boundaries, deny-overrides evaluation and multi-fact counterfactuals while retaining the document-centered workbench. It is a Fabius-assisted artifact, not a controlled model comparison. Verification above was rerun for these changes; historical verification is not presented as new evidence.
