# GitHub Actions

## `refresh-obf-images.yml` — Weekly Open Beauty Facts photo refresh

Triggers: weekly cron (Mondays 06:00 UTC) and **Run workflow** in the
Actions tab.

What it does: runs `pnpm --filter @workspace/scripts run refresh:obf-images`
to re-resolve the numeric "rev" segment in OBF front-image URLs hard-coded
in `artifacts/skinscreen/src/components/IngredientScanner.tsx`. OBF
contributors re-upload product photos and the old revs eventually 404, so
running this on a schedule keeps the scanner gallery from silently
breaking.

Outcomes:

- If the script rewrote any URLs, the workflow opens (or updates) a PR on
  branch `chore/refresh-obf-images` with the diff and immediately enables
  GitHub's **auto-merge** on it. Once the PR's required status checks
  pass, GitHub squash-merges it into `main` automatically — no human
  click required — and the deployed scanner gallery picks up the new
  revs on the next deploy.
- If a required check fails (or a required review is missing), auto-merge
  stays armed but the PR will not merge. That's the signal for a human
  to look at the diff and decide whether to fix the check, override, or
  close the PR.
- If the script exited non-zero — meaning at least one URL could not be
  resolved or HEAD-verified — the job fails before opening a PR. GitHub
  then emails repo watchers via the standard "Actions workflow failed"
  notification so the team can investigate before the gallery breaks.

No repo secrets required: the script only talks to the public OBF API and
uses `GITHUB_TOKEN` (provided automatically) to open the PR and arm
auto-merge.

**One-time repo setup:** auto-merge only works if it is enabled at the
repository level. In **Settings → General → Pull Requests**, tick
**Allow auto-merge**. Without it, the workflow's `gh pr merge --auto`
step will fail and the PR will sit unmerged until someone clicks Merge
manually. Configuring required status checks under **Settings → Branches
→ Branch protection rules** for `main` is what makes auto-merge actually
wait for CI; without any required checks, the PR will merge as soon as
auto-merge is armed.

## `android-release.yml` — Signed Android .aab on every tag

Triggers: `git push origin v1.2.3` (any tag matching `v*`), or **Run
workflow** in the Actions tab.

Output: `app-release.aab` uploaded as a workflow artifact and attached
to the matching GitHub Release. Upload that file to **Play Console →
Internal testing → Create new release**.

### Required repo secrets

Set these in **Settings → Secrets and variables → Actions** before the
first signed build:

| Secret | How to get it |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i mobile/capacitor/android/keystores/skinscreen-upload.jks \| pbcopy` |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password chosen when running `mobile/capacitor/scripts/create-android-keystore.sh` |
| `ANDROID_KEY_ALIAS` | `skinscreen-upload` (default) |
| `ANDROID_KEY_PASSWORD` | The key password chosen at keystore creation |

If `ANDROID_KEYSTORE_BASE64` is missing, the workflow still runs but
produces an **unsigned** `.aab` (debug keystore) so the pipeline can be
smoke-tested without credentials. Do not upload an unsigned `.aab` to
Play Console — Google rejects it.

### Backing up the keystore

Lose the upload keystore and you cannot ship updates to the same Play
listing without contacting Google (multi-day reset). Store the `.jks`
and its passwords in a password manager **and** print the base64 blob
to a paper backup.

### Optional input

`CAP_SERVER_URL` (manual run only) overrides the URL the native shell
loads. Useful for staging builds:

```
CAP_SERVER_URL = https://staging.skinscreen.chimiq.com
```

Leave blank to use the production URL baked into `capacitor.config.ts`.
