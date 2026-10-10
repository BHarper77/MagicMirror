# Runbook

Operational how-to for the mirror Pi. Decisions and their rationale live in
`docs/adr/`; this file is the "how do I actually do it" companion.

## Reaching the Pi

The Pi is on the same Tailscale tailnet as the dev machine, so it is reachable
from anywhere it has internet — home WiFi or phone hotspot, same address.

```sh
ssh admin@raspberrypi          # normal case
ssh admin@100.84.111.98        # if the hostname hangs (Tailscale MagicDNS is flaky)
```

Key-based auth, no password; `admin` has passwordless sudo. If the tailnet IP
gives *"Host key verification failed"*, add `-o HostKeyAlias=raspberrypi` —
`known_hosts` only carries the hostname's key.

Node is under **nvm** and login shells don't load it — source it before any
`node`/`pm2` command over SSH:

```sh
export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh
```

The repo on the Pi is at `~/Documents/MagicMirror` (not `~/MagicMirror`), and
its `origin` is HTTPS — pull-only. MagicMirror runs under pm2; see
`docs/adr/0002`.

### `tailscale` command not found

Node shows online in the Tailscale dashboard but `tailscale` isn't a recognised
command: the daemon (`tailscaled`) is running, but the CLI binary isn't on the
current shell's `PATH` — usually because you're on a minimal console login where
`/usr/sbin` isn't in `PATH`, or the shell hasn't picked up a newly installed
binary.

```sh
which tailscale
ls -l /usr/bin/tailscale /usr/sbin/tailscale
find / -name tailscale -type f 2>/dev/null

sudo tailscale status            # sudo resets PATH to include sbin — usually works
/usr/bin/tailscale status        # or call it by full path
hash -r                          # if the binary exists but the shell can't see it
sudo systemctl status tailscaled # confirm the daemon is up

curl -fsSL https://tailscale.com/install.sh | sh   # if only tailscaled installed, not the CLI
```

For Tailscale SSH specifically the Pi needs `sudo tailscale up --ssh` and the
tailnet ACL must permit it.

### Tailnet SSH/ping fails but `tailscale ping` works

All tailnet policy lives in the homelab repo (`tailnet/policy.hujson`), and the
GitOps apply overwrites anything edited in the admin console. When you change
access, change it in the repo.

**SSH/ping to 100.x times out.** On the Pi (over LAN, `ssh -o
HostKeyAlias=raspberrypi admin@192.168.1.157`), `journalctl -u tailscaled |
grep Drop` shows `Drop: TCP{… > 100.84.111.98:22} no rules matched`, and
`sudo tailscale debug netmap` has an empty `PacketFilter`. The cause was that
the policy grants only covered tagged nodes, and the Pi is untagged. Fixed by
the member→`autogroup:self` grant in homelab #109.

**`tailscale: tailnet policy does not permit you to SSH to this node`.** The Pi
runs Tailscale SSH (`RunSSH: true`), so tailscaled intercepts port 22 on the
tailnet, plain `ssh` included. `debug netmap` showed `SSHPolicy.rules: []`
because the GitOps apply had wiped the console-only ssh rule. Fixed by the
`ssh` block in `policy.hujson` (accept, member → self, users `autogroup:nonroot`
and `admin`), homelab #110.

## Closing the MagicMirror display at the Pi

With a keyboard/mouse plugged into the Pi (e.g. when SSH is down):

- `Ctrl`+`Q` — MagicMirror's built-in quit binding
- `Alt`+`F4` — closes the Electron window
- `Ctrl`+`Alt`+`F2` (F1–F6) — drop to a text console; log in and stop it there.
  Return to the display with `Ctrl`+`Alt`+`F1` (or F7).

```sh
export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh
pm2 list
pm2 stop MagicMirror        # pm2 restarts it on boot / on crash — stop, don't kill
pkill -f electron           # last resort; pm2 will respawn it unless stopped first
```

## MagicMirror versions and upgrades

Current: **MM v2.38.0**, Electron 44.4.5, Node **v24.21.0** (nvm). pm2 runs on
nvm default v20.9.0. Why, and what changed from 2.21: `docs/adr/0004`.

Use `nvm use 24.21.0` for `npm` in the MM dir or modules, and plain
`. nvm.sh` (default 20) for `pm2`. Don't use `pm2 restart --update-env`:
it swaps the ecosystem env for your shell's. Use
`pm2 delete MagicMirror && pm2 start ecosystem.config.js && pm2 save`.

### Modules: never patch

Third-party modules in `modules/` stay unmodified. To update one:

```sh
cd ~/Documents/MagicMirror/modules/MMM-Foo
git pull && npm install --omit=dev    # under node 24
git status                            # must be clean
```

Make tweaks in `config/config.js` / `config/custom.css`, or send them upstream.
If a module only works with a local edit, don't use it.

### Upgrading core

1. Back up: `tar --exclude=node_modules -czf ~/backups/mm-pre-X.tgz -C ~/Documents MagicMirror`
   (it holds config.js with secret calendar URLs, so keep it on the Pi).
2. On the dev machine, merge upstream on a branch:
   `git fetch upstream tag vX.Y.Z --no-tags && git merge vX.Y.Z`. Check release notes
   for node `engines` and breaking config changes. Push the branch.
3. On the Pi: `pm2 stop MagicMirror`, `git fetch origin <branch> && git merge --ff-only FETCH_HEAD`,
   `nvm install <node>` if `engines` changed (then update `NODE_BIN` in
   `ecosystem.config.js`), `rm -rf node_modules && npm run install-mm`,
   `node --run config:check`.
4. Restart (delete/start/save as above), wait ~90s, check
   `pm2 list` (↺ 0), `~/.pm2/logs/magicmirror-*.log`, and a screenshot:
   `XDG_RUNTIME_DIR=/run/user/1000 WAYLAND_DISPLAY=wayland-1 grim /tmp/m.png`.
5. Merge the branch to master and push.

### Rollback (2.38 → 2.21)

Pre-upgrade copies on the Pi: `~/backups/MagicMirror-2.21-full` (complete dir
incl. node_modules) and `~/backups/mm-pre-2.38-20261010.tgz` (no node_modules,
includes MMM-NBA and the pm2 dump).

```sh
pm2 stop MagicMirror
mv ~/Documents/MagicMirror ~/Documents/MagicMirror-2.38
cp -a ~/backups/MagicMirror-2.21-full ~/Documents/MagicMirror
cd ~/Documents/MagicMirror && pm2 delete MagicMirror && pm2 start ecosystem.config.js && pm2 save
```

The 2.21 `ecosystem.config.js` in that copy points at node v20.9.0, which is still installed.

## WiFi

Two profiles on `wlan0`: `Hyperoptic Fibre 2B43` (autoconnect priority **10**)
and `Pixel Hotspot` (priority **1**). Home deliberately wins — see
`docs/adr/0003`.

```sh
nmcli -t -f NAME,AUTOCONNECT,AUTOCONNECT-PRIORITY con show   # what's saved
nmcli -t -f DEVICE,STATE,CONNECTION dev status | grep wlan0  # what's active
sudo nmcli dev wifi rescan; nmcli dev wifi list              # what's in range
```

### Working off-site (shed)

Power the Pi on with the hotspot **already broadcasting**, wait a minute, then
SSH in as above. Nothing to configure on the Pi.

On the phone, before leaving:

- **Band must be 2.4GHz.** If the hotspot is on 5/6GHz the Pi may not see it at
  all (`docs/adr/0003`).
- **Turn off the idle auto-disable**, or Android drops the hotspot before the Pi
  boots and it finds nothing.
- **Don't rename it or change the password.** The profile is pinned to the exact
  SSID string; Android also regenerates the password on some settings changes.
  If any of these change, update the profile and re-test *before* travelling:

```sh
sudo nmcli con mod 'Pixel Hotspot' 802-11-wireless.ssid 'NEW SSID'
sudo nmcli con mod 'Pixel Hotspot' wifi-sec.psk 'NEWPASS'
```

### Testing a WiFi change safely

Always force the switch from a **detached script that unconditionally restores
home WiFi** — never an interactive `nmcli con up`. The SSH session dies the
instant `wlan0` moves, and a failed activation leaves nothing to put it back.

```sh
cat > /tmp/wifitest.sh <<'EOF'
#!/bin/bash
exec >/tmp/wifitest.log 2>&1
nmcli con up 'Pixel Hotspot'; sleep 15
nmcli -t -f DEVICE,STATE,CONNECTION dev status | grep wlan0
ip -4 addr show wlan0 | grep inet
ping -c3 -W3 8.8.8.8 | tail -3
getent hosts github.com
sleep 60                                  # window to test SSH from the laptop
nmcli con up 'Hyperoptic Fibre 2B43'      # runs even if the above failed
EOF
chmod +x /tmp/wifitest.sh
sudo setsid nohup /tmp/wifitest.sh >/dev/null 2>&1 </dev/null &
```

Then `cat /tmp/wifitest.log` once it finishes. Note the script keeps running if
you delete it mid-flight (bash holds the fd), but don't — you lose the log.

Expect: associated, an IP, 0% ping loss, DNS resolving, then back on Hyperoptic.
Verifying DNS matters — the mirror's modules and `git pull` both need it, and a
hotspot can associate fine while resolution is broken.

**No lockout risk either way:** home is priority 10 with autoconnect on, so once
the hotspot is out of range or switched off the Pi rejoins home by itself.

### Troubleshooting

| Symptom | Cause |
|---|---|
| Hotspot absent from `nmcli dev wifi list`, other networks visible | Phone is on 5/6GHz. Check the band **before** suspecting the Pi. |
| `Connection activation failed: The Wi-Fi network could not be found` | SSID mismatch — compare the profile against `nmcli dev wifi list` verbatim. |
| SSH times out just after a network switch | Normal — Tailscale re-establishes on the new network. Retry for a minute. |
| Tailscale never comes up off-site | It needs its control plane to establish; no mobile data means no tailnet. Fall back to the hotspot-assigned LAN IP from the phone's client list. |

Benign stderr noise from MagicMirror on the Pi — `gbm_wrapper … dma_buf`,
`GetVSyncParametersIfAvailable`, `Xlib: extension "DRI2" missing`,
`vaInitialize failed` — is normal Electron/GL warning, not failure.

## Unused hardware

`wlan1` is an `mt7601u` USB dongle (2.4GHz only), currently unused. Candidate
for a self-hosted fallback AP so the Pi broadcasts its own network and doesn't
depend on the phone at all. Not built.
