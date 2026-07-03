// PM2 process definition for the smart mirror. See docs/adr/0002-pm2-process-management.md.
// Deploy on the Pi with:  pm2 start ecosystem.config.js
//
// Node is installed via nvm on the Pi, so the node path and PATH below are
// hardcoded to the nvm version — systemd/PM2 at boot does NOT load nvm. If the
// Pi's node version changes (`nvm install …`), update both paths here.
module.exports = {
  apps: [
    {
      name: 'MagicMirror',
      cwd: '/home/admin/Documents/MagicMirror',
      // Run electron's CLI launcher under node explicitly (node -> electron
      // cli.js -> electron binary). Avoids relying on the `#!/usr/bin/env node`
      // shebang finding nvm's node, which isn't on PATH at boot.
      script: 'node_modules/.bin/electron',
      args: 'js/electron.js',
      interpreter: '/home/admin/.nvm/versions/node/v20.9.0/bin/node',
      env: {
        // MagicMirror is an Electron GUI: it must draw to the Pi's physical
        // screen. Set explicitly so it works when systemd launches PM2 at boot.
        DISPLAY: ':0',
        // Put nvm's node/npm first so any child process finds them at boot.
        PATH: '/home/admin/.nvm/versions/node/v20.9.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin',
      },
      // Crash policy: back off on repeated fast crashes (avoids SD/CPU thrash),
      // but a mirror that's been up >60s and glitches once resets the counter,
      // so max_restarts only trips on a genuine boot-loop.
      exp_backoff_restart_delay: 200,
      max_restarts: 10,
      min_uptime: '60s',
      // Explicit log paths; pm2-logrotate (set up on the Pi) caps their size.
      out_file: '/home/admin/.pm2/logs/magicmirror-out.log',
      error_file: '/home/admin/.pm2/logs/magicmirror-error.log',
      merge_logs: true,
    },
  ],
};
