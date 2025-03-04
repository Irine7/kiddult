module.exports = {
  apps: [{
    name: 'location-verification-server',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/pm2/error.log',
    out_file: 'logs/pm2/output.log',
    merge_logs: true,
    time: true
  }]
};