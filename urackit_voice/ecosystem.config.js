module.exports = {
    apps: [{
        name: 'urackit-voice',
        script: '/root/webhook/urackit_voice/venv/bin/python',
        args: '-m sip_integration.server',
        cwd: '/root/webhook/urackit_voice',
        interpreter: 'none',
        env: {
            PATH: '/root/webhook/urackit_voice/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
        },
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: '/root/.pm2/logs/urackit-voice-error.log',
        out_file: '/root/.pm2/logs/urackit-voice-out.log',
        merge_logs: true,
        max_restarts: 10,
        restart_delay: 3000,
        autorestart: true,
        watch: false
    }]
};
