module.exports = {
    apps: [{
        name: 'cineplus-backend',
        script: 'server.js',
        instances: 'max',
        exec_mode: 'cluster',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production'
        },
        error_file: 'logs/err.log',
        out_file: 'logs/out.log',
        log_file: 'logs/combined.log',
        time: true,
        merge_logs: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        max_restarts: 10,
        restart_delay: 4000,
        wait_ready: true,
        kill_timeout: 3000
    }]
}; 