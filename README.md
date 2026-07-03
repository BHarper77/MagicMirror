# Smart Mirror

Wall-mounted smart mirror: an LG 25UM58-P monitor + Raspberry Pi 4B behind two-way
glass, running [MagicMirror²](https://docs.magicmirror.builders). This repo is the
source of truth for the whole project — software fork here, hardware/build decisions
in [`docs/adr/`](docs/adr/), shared vocabulary in [`CONTEXT.md`](CONTEXT.md).

## Access the Pi

SSH in over Tailscale (works from anywhere on the tailnet):

```sh
ssh admin@raspberrypi
```

The MagicMirror code lives in `~/Documents/MagicMirror` on the Pi. Node is
installed via [nvm](https://github.com/nvm-sh/nvm), so `node`/`npm`/`pm2` are
only on the PATH of an interactive shell (they load from `~/.bashrc`).

## Run MagicMirror

MagicMirror is an Electron app that draws to the Pi's physical screen (`DISPLAY=:0`).
It's managed by [PM2](https://pm2.keymetrics.io/), which auto-starts it on boot,
restarts it if it crashes, and captures logs. The process definition lives in
[`ecosystem.config.js`](ecosystem.config.js); see
[ADR 0002](docs/adr/0002-pm2-process-management.md) for the reasoning.

Day-to-day control (over SSH):

```sh
pm2 status               # is the mirror running?
pm2 restart MagicMirror  # e.g. after a config/module change
pm2 stop MagicMirror     # stop it
pm2 start MagicMirror    # start it again
pm2 logs MagicMirror     # tail logs (Ctrl+C to exit the tail)
```

You normally never start it by hand — PM2 launches it on boot. To change _how_
it runs, edit `ecosystem.config.js`, then `pm2 restart ecosystem.config.js`.

````

## Turn the Pi on and off

The mirror runs 24/7 and has **no soft power button** — it powers on automatically
when mains is applied. See [ADR 0001](docs/adr/0001-frame-depth-set-by-monitor.md).

- **On:** apply power (plug it in). PM2 auto-starts MagicMirror on boot — nothing
  to do by hand.
- **Graceful shutdown / reboot** (over SSH):

  ```sh
  sudo shutdown -h now     # safe power-off, then pull mains
  sudo reboot              # restart the Pi
````

- **Hard off:** pull the mains only as a last resort — risks SD-card corruption.

---

Upstream project docs: <https://docs.magicmirror.builders>
