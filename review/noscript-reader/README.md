# No-JavaScript fallback verification

Baseline: main at `89cacd5b0bbb4a7951ab02fbc0c846c71b9af00e`.

The existing build already generates `issues/the-prompt-issue/pages/1/index.html` and all 196 reader pages. This change preserves the authored home fallback (heading, one-sentence description, three links and cover), and moves inline static-reader styles into stylesheet classes using existing color tokens.

Screenshots use Chromium with JavaScript disabled, a 1280×900 viewport and a preview of this worktree's built site on port 4175:

- [Before](before.jpg)
- [After](after.jpg)
- [Static reader after clicking Read the issue](reader.jpg)

Verification output:

```text
npm ci: completed; found 0 vulnerabilities
npm test: Test Files 26 passed (26); Tests 182 passed (182)
npm run build: completed successfully
No-JavaScript build check: 197 static pages, 2938 local targets; no unresolved base URLs, missing files or inline styles.
Lighthouse accessibility: before 100, after 100
External PDF URL: HTTP 200
External source/production notes URL: HTTP 200
```

The automated browser check did not pass:

```text
npx playwright test tests/browser/no-javascript.spec.ts --project=desktop-dark
2 passed; 1 failed
home fallback preserves its content and scoped build URLs:
Expected: The Portrait Edit
Received: The Portrait Edit — The Prompt Issue
```

Playwright is configured to reuse an existing server on port 4173. That port was already serving the old build from another checkout; this worktree's separate preview on port 4175 showed the expected new heading and working static reader. Following the requested stop-on-failure rule, no merge or deployment was attempted. The browser check needs to be rerun against an isolated preview before this PR can be merged.
