# Settings storage: making saves snappier and safer

Not scheduled. Written 2026-08-03 after a support ticket (Galit, goldlifeaxis.com) where
chatbot settings appeared to save and then reverted on refresh. Each stage below is
shippable on its own, in order, and each is useful without the ones after it.

## Where we are

Everything lives in a single WordPress option, `mwai_options`, and the REST route
`settings/update` **replaces the whole array**. Three consequences:

- **Last writer wins, silently.** A second admin, or the same admin with an old tab open,
  saves a stale snapshot over everything. Nobody is told. This is the likely cause of the
  ticket above: the user did not lose one setting, they lost the environment, the knowledge
  env and the instructions all at once, which is what a whole-object overwrite looks like.
- **The blast radius is the whole configuration**, including API keys. A one-key POST once
  wiped every environment and key on a test site of ours. If it can catch us, it will catch
  an integrator.
- **It is large.** 559 KB on a normal site. `autoload` is off, so it is not read on every
  page load, but it is serialized, sent and written in full on every save.

## What is actually in those 559 KB

Measured on a real site, top-level keys by serialized size:

| Key | Size | Share |
|---|---|---|
| `ai_engines` | 254 KB | 47% |
| `ai_models` | 214 KB | 40% |
| `ai_models_usage_daily` | 18 KB | 3% |
| `ai_usage_daily` | 17 KB | 3% |
| `ai_models_usage` + `ai_usage` | 21 KB | 4% |
| everything else (117 keys) | 35 KB | 3% |

`ai_engines` holds 11 engines, and 252 KB of its 254 KB is the `models` array hanging off
each one. `ai_models` is a flat catalog of 430 model definitions. So **about 86% of the
settings blob is a model catalogue**, not settings: data we either ship in
`constants/models.php` or fetched from a provider and cached here.

The real user settings are roughly 35 KB. Everything else is cache and counters riding along
on every save.

## Stage 1: shrink it (biggest win, lowest risk)

Move the catalogue out of `mwai_options` into its own option(s), rebuilt on demand:

- `ai_engines[*].models` and `ai_models` move to something like `mwai_models_cache`.
- Usage counters (`ai_usage*`, `ai_models_usage*`) move to their own option, or better to a
  table, since they are append-heavy and have nothing to do with configuration.

That takes the settings row from ~559 KB to ~35 KB. Saves get roughly 15x smaller, the
window for a partial write shrinks with it, and losing the cache costs a refetch rather than
a configuration.

**No REST contract change**, so nothing outside the plugin notices. Do this one first.

## Stage 2: merge on write instead of replacing

`settings/update` should merge the payload into the stored array key by key, so a client can
send only what changed.

- Kills the stale-tab class outright: an old tab that only touches `chatbot_defaults` can no
  longer erase `ai_envs`.
- Makes the REST API safe for integrators, who currently have to read-modify-write the whole
  object and usually do not know it.
- **Compatibility:** a full object must keep working, because that is what every existing
  client sends. Merging a complete payload is identical to replacing it, so this is
  backwards-compatible by construction. The only true removal case (a user deleting the last
  AI environment) needs an explicit signal, for example a `replace: true` flag or an explicit
  empty array for that key. Decide this before writing code.

## Stage 3: refuse stale saves

Merging fixes the tab that touched a different section. It does not fix two people editing
the same section. For that, send a version with the settings:

- The GET returns a hash of the stored array. The client sends it back on save.
- If it does not match what is stored, reject with a clear error and let the UI say "this
  page is out of date, reload before saving".

Small, and it turns a silent loss into a visible, understandable refusal.

## Stage 4: move credentials out

`ai_envs` (API keys) into its own option. After stages 1 to 3 this is belt and braces, but it
means no settings mishap can ever cost someone their keys, which is the failure people
actually remember.

## Backups

Worth doing early, and independently of the rest: keep the last **three** snapshots of
`mwai_options`, rotated on write.

- Write the current value to `mwai_options_backup_1..3` before each save, rotating, all with
  `autoload` off.
- Surface them in Dev Tools: "Restore settings from 2 saves ago", with the timestamp and the
  size.
- Cheap, and it converts an entire class of support ticket ("my settings vanished") into a
  one-click recovery, whatever the cause. It also derisks stages 1 to 4.
- Skip writing a backup when the value is unchanged, so a save that touches nothing does not
  push the useful history out.

## Rules while doing any of this

- **The REST contract is sacred.** `settings/update` must keep accepting a complete object
  and behaving as it does today.
- **Migrations must be idempotent**, and must not lose data if a site is on an old version,
  reverts, or runs the migration twice.
- **Never write a partial object** from any of our own code paths in the meantime. See the
  existing rule about this.

## How to check it worked

1. `SELECT LENGTH(option_value), autoload FROM wp_options WHERE option_name = 'mwai_options'`
   before and after stage 1. Expect roughly 559 KB down to 35 KB on a comparable site.
2. **The two-tab test**, which is the whole point: open Settings in two tabs, change the AI
   environment in tab A and save, change a chatbot default in tab B and save, reload. Today
   tab A's change is gone. After stage 2 both survive. After stage 3, tab B is told to
   reload instead of being allowed to clobber.
3. Same test with a persistent object cache enabled, since that is a common ingredient in
   these reports.
