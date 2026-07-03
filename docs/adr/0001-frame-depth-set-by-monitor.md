# Frame depth is set by the monitor, not the wiring

The mirror uses a custom-built frame where we control the internal depth, and we want it as shallow as possible. Investigating "low-profile extension leads" for the monitor + Pi power revealed the lead is the wrong thing to optimise: the **binding constraint on build depth is the monitor's own centre bulge (~60mm)**, not any wiring component. As long as the extension socket(s) and both plug-top power supplies are mounted flat / aimed sideways so they sit *within* that ~60mm envelope, the wiring costs zero additional depth. Therefore we target the monitor bulge as the depth floor and choose the extension lead for **safety and routing flexibility, not slimness**.

## Context / measurements

- **Monitor:** LG 25UM58-P (25", 2560×1080). Runs on **19V DC only** via a barrel jack — no mains input, no USB output.
- **Monitor bulge:** ~60mm max thickness. The monitor is **already de-cased** — the 60mm is the bare LCD panel + its LG driver board stacked behind it. Reducible by removing/relocating the power button; ~70–80mm with a straight HDMI cable, cut down with a **right-angle HDMI** adapter. **Biggest remaining lever (mechanical, no wiring): remount the driver board flat off to the side** on its existing ribbon — drops central depth below 60mm. Caution: panel↔board ribbon is short/fragile, check reach first.
- **Monitor adapter:** genuine LG plug-top (AC-DC in the plug body, captive DC cable to monitor), ~**45mm** deep, **19V 2.1A (40W)**, barrel **6.5×4.4mm centre-positive**. Model referenced as ADS-40FSG-19 19025GPB-2 (note: that part number is usually a line brick — the physical unit on hand is a plug-top, likely a replacement variant).
- **Pi:** Raspberry Pi 4B, powered from its **official 5V/3A USB-C supply** — *not* from a USB port on the extension lead (Pi 4B browns out on shared 2.4A USB-A ports → under-voltage, SD corruption).
- **Sockets needed:** two 3-pin (monitor adapter + Pi supply).

## Decisions

1. **Depth floor = monitor bulge (~60mm).** Build the frame to that; don't chase a slimmer extension lead — it can't beat the monitor.
2. **Mount all wiring flat / aimed sideways** within the bulge envelope. Aim the fat 45mm monitor adapter *down into the bottom frame rail* (deeper, behind the wooden moulding) so it runs parallel to the panel.
3. **Keep the genuine LG 19V adapter.** Don't buy a "smaller" one — plug-tops are all ~30–45mm and a wrong barrel size/voltage damages the panel. It must stay 19V, ≥2.1A, 6.5×4.4mm centre-positive.
4. **Right-angle HDMI** to kill cable protrusion.
5. **Two 3-pin sockets**, Pi on its official USB-C supply.
6. **Monitor always-on 24/7**; display dimming/blanking to be done Pi-side (separate decision), not via the monitor's power. Motion-detection is far-future.

## Extension lead / supply — decided (for now)

**Chosen: two bricks + a certified rigid Masterplug trailing socket** (BS 1363), mounted sideways in the bottom rail so both plug-tops run parallel to the panel. Picked for **simplicity and zero DC wiring**. To be revisited when the frame is built (~mid-July 2026).

### Considered and rejected

- **Single 19V supply + buck converter to 5V for the Pi** — eliminates the second brick and the split entirely (one plug, one socket). Rejected: owner does **not** want to do any DC/PCB/buck wiring.
- **Bare panel + V59 driver board on 12V** — the truly-slim (~12–15mm) route. Moot/rejected: monitor is already de-cased but keeps its **LG driver board** (needs 19V); swapping to a V59 is wiring + panel-matching work the owner doesn't want.
- **Unbranded Y-splitter** (independent, aimable sockets) — rejected for a permanently sealed, rented, 24/7 install on safety grounds. (Note: reputable brands only make rigid blocks; experienced builders sidestep splitters via a single supply, hence few online posts.)
- **Smaller replacement adapter** — possible *only* if **19V, ≥2.1A/40W, 6.5×4.4mm centre-positive, CE/UKCA**. Do **not** trade amps for size: a 25W TV adapter underpowers this panel and overheats sealed-in. Size barely tracks wattage anyway, so little to gain.

## To verify

- **Power button removal:** confirm the monitor **auto-powers-on when mains is applied** *before* removing/disabling the button, or a mains cut leaves a black mirror with no way to wake it.

## Safety note (renting, sealed-in, 24/7)

The mains connection lives permanently sealed inside furniture in a rented flat and runs warm. Whatever lead is used must be **BS 1363 certified**, **fused in the plug**, **strain-relieved**, and have **airflow** around the supplies. Avoid unbranded splitters for this reason.
