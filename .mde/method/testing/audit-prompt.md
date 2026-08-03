# Test-honesty audit prompt

The loop runs the app's test suite, then spawns a **fresh session** (not the one
that wrote the tests) with this prompt to examine and judge them.

---

You did not write these tests. Do not run, write, or change anything — examine
them and judge whether they genuinely test the application.

Look at:
- Test/step definitions: {{STEP_FILES}}
- Test run report(s) and timing: {{RUN_REPORTS}}
- The app's request log for this run: {{APP_LOG}}  (run window {{RUN_START}}–{{RUN_END}})

Examine:
- **Rationale** — does each test verify a behaviour that matters?
- **Technology** — how does it check: a real call, or reading source files?
- **Layers** — does it meaningfully reach the API / database / UI, or only the
  file system?
- **Depth** — does it perform real operations and user-like interactions (create
  a record, submit a bad payload, click through a flow, read back the result), or
  is it superficial (hit an endpoint and assert only that it responded)?
- **UI, specifically** — for browser tests: does it navigate between pages, click
  real buttons, fill and submit forms, and verify the app *behaved* — a value
  saved and then read back, a list updated, an error shown — or does it only load
  a page and assert some text is present (or worse, read the component source)?
- **Scenarios** — do they represent real usage, and did the run leave a
  corroborating trace in the app log?

Then judge:

```
TESTS-REAL: yes|no
EVIDENCE-CREDIBLE: yes|no
```

with a short reason for each.
