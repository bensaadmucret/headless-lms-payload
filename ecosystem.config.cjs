/**
 * Configuration PM2 pour les workers de traitement de documents
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 status
 *   pm2 logs workers
 *   pm2 stop workers
 *   pm2 restart workers
 *   pm2 delete workers
 */

module.exports = {
  apps: [
    {
      name: 'workers',
      script: 'src/scripts/start-workers.ts',
      interpreter: 'node',
      interpreter_args: '--require ./node_modules/tsx/dist/preflight.cjs --import ./node_modules/tsx/dist/loader.mjs --expose-gc --max-old-space-size=2048',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'development',
        NODE_OPTIONS: '--no-deprecation',
      },
      env_production: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--no-deprecation',
      },
      error_file: './logs/workers-error.log',
      out_file: './logs/workers-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
