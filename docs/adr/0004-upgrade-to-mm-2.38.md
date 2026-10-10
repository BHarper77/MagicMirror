# Upgrade to MagicMirror 2.38; modules stay unpatched

Status: accepted (2026-10-10)

The mirror ran MM core **v2.21.0** (Oct 2022, Electron 19). Its old Electron had
no global `fetch`, so current third-party modules only worked with local edits
(`MMM-MyScoreboard/node_helper.js` fetch polyfill), and every module update meant
stash/patch/conflict. We upgrade core to **v2.38.0** (Electron 44.4.5, Node
v24.21.0) so modules run as published.

## Decisions

1. **Merge upstream tags into the fork.** v2.38.0 was merged into `master` as a
   real merge (tree = upstream + fork files), so the next upgrade is
   `git merge vX.Y.Z` with a proper merge base. Fork-only files: `docs/`,
   `.claude/`, `README.md`, `CONTEXT.md`, `GLASS_SUPPLIERS.md`,
   `ecosystem.config.js`, and the calendar `showDaysUntil` option (now in
   `defaultmodules/calendar/calendar.js`). The repo is now LF-normalised
   (upstream `.gitattributes`).
2. **Third-party modules are never patched.** Updates are
   `git pull && npm install --omit=dev` in the module dir; `git status` must stay
   clean. Needed tweaks go in `config/config.js` or `config/custom.css`, or
   upstream as a PR. `MMM-NBA` (unused, carried local edits) was removed.
3. **Node v24.21.0 (nvm) for MM.** 2.38 needs `>=22.22.2 <23 || >=24`.
   `ecosystem.config.js` pins it as the interpreter. pm2 itself (and its
   systemd unit) stays on nvm default v20.9.0 — moving pm2 means re-running
   `pm2 startup`, deferred.
4. **XWayland, not native Wayland.** Upstream's default start since 2.35 is
   `start:wayland`; under wayfire on the Pi the Electron 44 window starts but
   never appears. pm2 runs the `start:x11` equivalent (`DISPLAY=:0`, no
   `WAYLAND_DISPLAY`), as before the upgrade.
5. **`electronOptions: { transparent: false }` in config.js.** Electron 44
   aborts (SIGTRAP crash loop) with MM's default transparent + fullscreen
   window on this Pi. The background is black anyway, so nothing visible is lost.
6. **OpenWeatherMap stays on the free 2.5 API.** Since 2.29 the provider defaults
   to `/onecall` 3.0 (paid). config.js sets `apiVersion: "2.5"`,
   `weatherEndpoint: "/forecast"`, which is what 2.21 used for `type: "daily"`.

## Other breaking changes handled

- Default modules moved `modules/default` → `defaultmodules/`; `modules/` holds
  only third-party modules.
- `css/custom.css` moved to `config/custom.css` (new `customCss` default).
- Dropped the fork's `server: nodemon` script tweak (upstream has `server:watch`).
