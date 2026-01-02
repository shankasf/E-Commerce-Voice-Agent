module.exports = {
    apps: [
        {
            name: 'glambook-backend',
            cwd: './backend',
            script: 'npm',
            args: 'run start:prod',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        },
        {
            name: 'glambook-ai-service',
            cwd: './ai-service',
            script: 'python',
            args: 'main.py',
            interpreter: 'python3',
            env: {
                PYTHONUNBUFFERED: '1',
                PORT: 8086
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '2G'
        }
    ]
};
