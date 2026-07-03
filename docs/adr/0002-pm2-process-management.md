# MagicMirror runs under PM2

Status: accepted (2026-07-03)

The Pi is a 24/7 single-purpose appliance and we want it to boot straight into
the mirror and self-heal. Until now MagicMirror was started **by hand** over SSH
with `npm start`: foreground Electron on `DISPLAY=:0` that died when the SSH
session closed, did not start on boot, had no crash recovery, and was stopped
with `pkill -f electron`. We replace that with [PM2](https://pm2.keymetrics.io/),
a Node process manager, driven by a **checked-in `ecosystem.config.js`**.

## Decisions

1. **Manage MM with PM2**, defined by `ecosystem.config.js` in the repo root —
   version-controlled and reproducible (reflash the Pi → `pm2 start
   ecosystem.config.js` restores everything), rather than an imperative
   `pm2 start …` whose definition only lives in `~/.pm2/dump.pm2` on the SD card.
2. **Run as the `admin` user** — the account that owns the desktop session and
   `DISPLAY=:0`. Avoids cross-user permission friction; a dedicated service user
   buys nothing on a single-purpose Pi.
3. **Launch via `node → electron cli.js → js/electron.js`** (`script:
   node_modules/.bin/electron`, `args: js/electron.js`, `interpreter:` the nvm
   node binary) instead of `npm start`. This gives PM2 the real process (no
   `npm` wrapper that can leave Electron lingering) and runs Electron's launcher
   under an explicit node path rather than trusting its `#!/usr/bin/env node`
   shebang to resolve — node is **nvm-installed** and is *not* on the PATH
   systemd gives PM2 at boot.
4. **`env: { DISPLAY: ':0', PATH: <nvm-bin>:… }` explicit in the config.**
   `DISPLAY` so the Electron GUI finds the physical screen; `PATH` with nvm's
   node/npm bin prepended so any child process resolves node at boot. Both are
   things `npm start`'s interactive shell provided and systemd does not.
   Trade-off: the nvm node version (`v20.9.0`) is hardcoded in the paths — a
   `nvm install` of a new node means updating `ecosystem.config.js`.
5. **Crash policy: `exp_backoff_restart_delay: 200` + `max_restarts: 10` +
   `min_uptime: '60s'`.** Backoff ramps the retry delay on repeated fast crashes
   (no SD/CPU thrash). `min_uptime` resets the restart counter once MM has been
   up 60s, so `max_restarts: 10` only trips on a genuine boot-loop — a mirror
   that runs for hours and glitches once recovers and never nears the cap.
6. **Boot start via `pm2 startup` (systemd) + `pm2 save`.**
7. **Logs: explicit files under `~/.pm2/logs/`, rotated by `pm2-logrotate`**
   (`max_size 10M`, `retain 7`, `compress true`). Unrotated PM2 logs grow
   unbounded and would fill the SD card over months on a 24/7 box.
8. **Crash alerting via `pm2-discord`** → Discord webhook, **events only**
   (`error`/`restart`/`kill`/`exception` on, `log` off, so normal MM chatter
   doesn't spam the channel). The webhook URL is a **secret**: set on the Pi with
   `pm2 set pm2-discord:discord_url …`, **never committed** to the repo.

## Considered and rejected

- **Status quo (manual `npm start` / `nohup`)** — no boot start, no crash
  recovery, manual stop. The problem we're solving.
- **A hand-written systemd unit** — more control over boot ordering, but more
  boilerplate and no built-in log rotation, crash backoff, or alerting. PM2
  gives all of that in one tool (and uses systemd under the hood anyway via
  `pm2 startup`).
- **Dedicated `magicmirror` service user** — cleaner isolation in theory, but
  desktop-session/`DISPLAY` permission friction for zero benefit here.
- **Unlimited restarts** — self-heals forever, but a broken config boot-loops
  and hammers the SD card. Capped instead (decision 5).

## Verified (2026-07-03, on install)

- Set up live on the Pi: node v20.9.0 (nvm), repo at `~/Documents/MagicMirror`,
  pm2 7.0.3, `pm2-admin` systemd unit **enabled + active**.
- **Boot test passed:** a full `sudo reboot` auto-resurrected MagicMirror with
  **`restarts=0`** and `Launching application` in the log — it did *not* exhaust
  `max_restarts` waiting for X. The boot-timing risk did not materialise; no
  graphical-target dependency needed.
- Discord alert wired (webhook set on-Pi via `pm2 set`, not committed); a
  `pm2 restart` fired the restart event. Confirm the message actually lands in
  the channel.

### Follow-ups (not blocking)

- The Pi could not auth to GitHub over SSH (`Permission denied (publickey)`), so
  its `origin` was switched to **HTTPS** — pulls work (public repo); pushes from
  the Pi would need a key, but the Pi is a deploy target, not a dev box.
