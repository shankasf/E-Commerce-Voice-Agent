module.exports = {
    apps: [
        {
            name: 'google-map-agent',
            script: 'dist/server.js',
            cwd: '/root/webhook/google_map',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 3002,
                BASE_PATH: '/google_map'
            },
            error_file: '/root/webhook/google_map/logs/error.log',
            out_file: '/root/webhook/google_map/logs/out.log',
            log_file: '/root/webhook/google_map/logs/combined.log',
            time: true
        }
    ]
};
