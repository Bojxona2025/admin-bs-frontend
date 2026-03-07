module.exports = {
    apps: [
        {
            name: "admin-frontend",
            script: "npx",
            args: "serve -s dist -l 5173",

            env: {
                NODE_ENV: "production",
                VITE_BASE_URL: "https://bsmarket.uz/api",
                VITE_NOTIFICATION_SOCKET_URL: "https://bsmarket.uz",

            },
        },
    ],
};


