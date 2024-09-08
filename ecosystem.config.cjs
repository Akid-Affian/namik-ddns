module.exports = {
    apps: [
        {
            name: 'ddns',
            script: './dist/server/entry.mjs',
            env: {
                NODE_ENV: 'development',
                PORT: 4321,
            },
            env_production: {
                NODE_ENV: process.env.NODE_ENV || 'production',
                PORT: process.env.PORT || 4321,
                HOST: '0.0.0.0',
                BASE_DOMAIN: process.env.BASE_DOMAIN || '',
                NAMESERVERS: process.env.NAMESERVERS || '',
            },
        },
    ],
};
