# WiFi power-save is off on the Pi

Status: accepted (2026-10-16)

On 2026-10-14 ~23:50 the Pi's `wlan0` stopped passing traffic while staying
associated: no kernel, `wpa_supplicant` or NetworkManager events, DNS to the
router timing out, `no route to host` to everything, and the DHCP renewal a day
later failing with `no lease`. NetworkManager saw nothing wrong, so nothing
recovered it, and the mirror was offline ~46h until a power cycle. SD card
(`mmc`), undervoltage and router/ISP were ruled out from the logs.

The cause is not proven, but the `brcmfmac` (BCM43455) driver had power save
enabled (NM default) and that is the known cause of this symptom. The Pi is
mains-powered and only runs the mirror, and WiFi power save saves ~0.1-0.3 W,
negligible next to the screen. So it is forced **off**:
`/etc/NetworkManager/conf.d/wifi-powersave.conf` (`wifi.powersave = 2`) plus
the same on both saved profiles.

If it recurs with power save confirmed off, the next step is a gateway-ping
watchdog timer that bounces `wlan0` (then reloads `brcmfmac`, then reboots).
Not built.
