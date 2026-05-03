# GitHub Actions

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
