// PM2 process definition for the smart mirror. See docs/adr/0002-pm2-process-management.md
// and docs/adr/0004-upgrade-to-mm-2.38.md.
// Deploy on the Pi with:  pm2 start ecosystem.config.js
//
// Node is installed via nvm on the Pi, so the node path and PATH below are
// hardcoded to the nvm version — systemd/PM2 at boot does NOT load nvm. If the
// Pi's node version changes (`nvm install …`), update NODE_BIN here.
// MM 2.38 needs node >=22.22.2 <23 || >=24 (package.json "engines").
const NODE_BIN = "/home/admin/.nvm/versions/node/v24.21.0/bin";

module.exports = {
	apps: [
		{
			name: "MagicMirror",
			cwd: "/home/admin/Documents/MagicMirror",
			// Run electron's CLI launcher under node explicitly (node -> electron
			// cli.js -> electron binary). Avoids relying on the `#!/usr/bin/env node`
			// shebang finding nvm's node, which isn't on PATH at boot.
			// Args mirror upstream `npm run start:x11` (runs via XWayland). Native
			// Wayland (`start:wayland`, upstream default since 2.35) starts but the
			// window never appears under wayfire — see docs/adr/0004.
			script: "node_modules/.bin/electron",
			args: "js/electron.js",
			interpreter: `${NODE_BIN}/node`,
			env: {
				// MagicMirror is an Electron GUI: it must draw to the Pi's physical
				// screen (XWayland :0). Set explicitly so it works when systemd launches
				// PM2 at boot. Do NOT set WAYLAND_DISPLAY: Electron 44 would pick Wayland.
				DISPLAY: ":0",
				// Put nvm's node/npm first so any child process finds them at boot.
				PATH: `${NODE_BIN}:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin`
			},
			// Crash policy: back off on repeated fast crashes (avoids SD/CPU thrash),
			// but a mirror that's been up >60s and glitches once resets the counter,
			// so max_restarts only trips on a genuine boot-loop.
			exp_backoff_restart_delay: 200,
			max_restarts: 10,
			min_uptime: "60s",
			// Explicit log paths; pm2-logrotate (set up on the Pi) caps their size.
			out_file: "/home/admin/.pm2/logs/magicmirror-out.log",
			error_file: "/home/admin/.pm2/logs/magicmirror-error.log",
			merge_logs: true
		}
	]
};
