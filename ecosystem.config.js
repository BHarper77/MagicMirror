// PM2 process definition for the smart mirror. See docs/adr/0002-pm2-process-management.md.
// Deploy on the Pi with:  pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'MagicMirror',
      // Launch Electron directly (not `npm start`) so PM2 tracks the real GUI
      // process — stop/restart then signal Electron cleanly, no npm wrapper.
      script: 'node_modules/.bin/electron',
      args: 'js/electron.js',
      interpreter: 'none',
      cwd: '/home/admin/MagicMirror',
      // MagicMirror is an Electron GUI: it must draw to the Pi's physical
      // screen. Set explicitly so it works when systemd launches PM2 at boot.
      env: {
        DISPLAY: ':0',
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
