# Runner corrections before candidate inspection

The fixed rubric has not changed. These harness defects were identified with oracle-owned controls before opening any candidate artifact:

1. The corrupt-storage check initially selected the normal Export button before the explicit original-bytes recovery control. The selector now prioritizes controls labelled original/corrupt/raw/recovery, then download/backup, then generic export. The accepted reset is also executed after proving cancellation leaves bytes unchanged.
2. Hidden required fields in a closed form were initially counted as visible validation feedback. Native invalidity now counts only rendered visible controls.
3. An attempted task title containing “unsaved” was initially mistaken for a quota-error notice. Notice extraction now excludes task-card and task-form user content and invisible text. The silent-quota fixture must therefore fail from the absence of actual error feedback.
4. Independent invalid-form cases reset only the harness-owned test storage between cases so a browser-enforced maxlength can safely truncate a valid submission without contaminating the next case.

The positive/negative control suite is rerun after these corrections. The preliminary self-test is retained separately, including its failures; no benchmark result has been adjusted to fit these controls.
5. Board equality is semantic: object-key order and task-array order do not change the board contract. Comparison canonicalizes object keys and compares tasks by ID. Corrupt bytes and invalid-import atomicity still require byte-for-byte preservation. A valid control that reverses keys and record order is included to prevent accidental serialization requirements.
6. Quota testing captures the board's actual persisted bytes after startup instead of assuming the candidate preserves the fixture's JSON formatting. Recoverable input values must be visible, or the attempted record must remain visible in the working board.
7. Context creation, storage/filesystem infrastructure failures and connection-refused navigation are distinguished from product scenario failures. Negative controls must fail at the intended observation key, not merely throw an unrelated exception.

# Documented correction after inspecting run-12

The original run-12 report is retained at `graded/run-12/web-before-top-anchor-fix/results.json`.

8. L01 incorrectly classified the standard empty-fragment home link (`href="#"`) as a nonexistent element ID. An empty fragment is valid document-top navigation; named section fragments must still identify a real element. The predicate now distinguishes document-top links from section links. A positive fixture with a top link and a negative fixture with a genuinely nonexistent section run in both engines and both widths. Run-12 is fully rerun; all subsequent candidates use the same corrected predicate. No product artifact was edited and the frozen rubric is unchanged.
9. L04 now records parent/grandparent visible text adjacent to each price for manual billing-period adjudication. The existing global body regex is insufficient proof because both billing options can remain visible. This is additional evidence for the already-required period label, not a new criterion or automatic penalty. Every landing receives the same manual period/content/claims review.

# Documented correction after inspecting run-08

The original run-08 report is retained at `graded/run-08/web/pre-revision-3/results.json`. Original runner revision 2 remains in `grade.pre-inline-feedback-fix.mjs`.

10. A06 incorrectly excluded the complete task form when identifying error messages, missing genuine visible inline validation feedback. Validation now also compares visible body text immediately before and after the invalid submission. Only newly appearing error/instruction lines count; static labels, user-entered input values and hidden text do not. Native invalidity counts as native feedback only when the form has not disabled native validation. A visible custom error is therefore accepted without requiring an undocumented error selector or ARIA role. Positive inline-error and negative silent-rejection fixtures cover both engines and widths. The prior silent-quota/task-title regression is also retained.
11. A01's lexical framing predicate missed the visible equivalent wording “LOCAL EDITION” and “Saved on this device.” These explicit local-device phrases are accepted, while the exact observed UI framing is also recorded and manually adjudicated for every app. Positive equivalent-wording and negative absent-framing controls cover all four environments. This does not waive the factual/local-only framing criterion or infer it from metadata.

Run-08 is fully rerun; run-06 and all subsequent apps use the same revision. Neither change alters the frozen rubric or candidate artifacts. Landing checks are unaffected.

# Documented correction after inspecting run-06

The complete run-06 matrix remains unchanged in `graded/run-06/web/results.json`; its corrected A08 verdict is backed by a separate focused rerun rather than rewriting the original observations. Run-08 receives the identical A08 rerun. Previous runner revision 3 is retained in `grade.pre-import-wording-fix.mjs`.

12. A08's notice regex missed clearly visible, valid error wording: “This is not valid JSON” and “Import could not be completed.” The predicate recognizes these equivalent failure phrases. Positive alternate-wording and negative silent-rejection fixtures run in both engines and both widths, alongside the original control. The A08 matrix is rerun symmetrically for both apps; the original complete matrices and their hashes remain intact. No requirement or candidate artifact changes.

A separate positive/negative modal-focus control checks the existing A06 focus-restoration requirement. Candidate pointer-open and keyboard-open probes are preserved separately and delayed by 550 ms before the focus verdict, so WebKit pointer behavior is not confused with asynchronous dialog closing.

The project named `all` probe is explicitly exploratory because it was introduced after rubric freeze. It is run identically against both apps and does not change primary group scores. Its contract ambiguity (valid project text versus the `all` filter sentinel), observed UI behavior and unchanged storage are recorded separately.

# Second-repeat supplementary evidence

The same pointer/keyboard modal probes and exploratory `all` project fixture run against all four app artifacts. A separate capture-phase event trace records which option the harness actually selects before candidate handlers run. It confirms index 1 (`all`) in all four apps; one app subsequently resets its control to index 0 (`All projects`). This is diagnostic evidence for the existing exploratory observation, not a new scoring rule or a primary runner change. Original probe reports are preserved, with `selection-trace.json` alongside each. No artifact was edited.
