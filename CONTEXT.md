# Smart Mirror Build

The physical + software project turning an LG monitor, a Raspberry Pi, and two-way glass into a wall-mounted smart mirror running MagicMirror. This repo is the source of truth for the whole thing: software (the MagicMirror fork), hardware decisions, carpentry, and wiring. Decisions live in `docs/adr/`; this file pins the shared vocabulary.

## Language

**The Build**:
The complete physical mirror unit — glass, frame, monitor, Pi, and wiring — as one assembly.

**Frame**:
The custom-made surround that holds the glass and monitor and encloses the electronics. Built to our own depth.
_Avoid_: case, housing

**Bottom rail**:
The lower horizontal member of the **Frame**. Deeper than the zone over the glass (it's solid moulding, not panel), so it's where bulky supplies and the extension lead live.

**Build depth**:
Front-to-back thickness of the finished **Build** — the number we're minimising. Floored by the **Monitor bulge**, not by the wiring.

**Monitor bulge**:
The thickest part of the de-cased monitor — the bare LCD panel plus its LG driver board stacked behind it (~60mm on the LG 25UM58-P). The binding constraint on **Build depth**; slimmable by remounting the driver board flat to the side.

**Plug-top adapter**:
A power supply where the AC-DC conversion sits in the body that plugs directly into the mains, with a captive DC lead out. The monitor's 19V supply is one. Protrudes by a fixed depth regardless of orientation — contrast a _line brick_ (box mid-cable, plugs in via a slim figure-8 lead) which can lie flat.

## Relationships

- **The Build** = **Frame** + glass + monitor + Pi + wiring
- **Build depth** is floored by the **Monitor bulge**; wiring is mounted to sit *within* that envelope
- Bulky supplies (**Plug-top adapters**) are aimed into the **Bottom rail** so they run parallel to the panel

## Example dialogue

> **Me:** "Can we get the mirror thinner by buying a low-profile extension lead?"
> **Reality:** "No — **Build depth** is set by the **Monitor bulge** (~60mm). The lead only matters if it can't hide inside that. Pick the lead for safety, not slimness."

## Flagged ambiguities

- "brick" was used for the monitor's supply, but it's a **Plug-top adapter** (fixed protrusion), not a line brick (lies flat) — the distinction drives the wiring/depth strategy.
