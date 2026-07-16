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
`GetVSyncParametersIfAvailable` — is normal Electron/GL warning, not failure.

## Unused hardware

`wlan1` is an `mt7601u` USB dongle (2.4GHz only), currently unused. Candidate
for a self-hosted fallback AP so the Pi broadcasts its own network and doesn't
depend on the phone at all. Not built.
