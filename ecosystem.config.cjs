module.exports = {
    apps: [
        {
            name: "next-app",
            script: "./node_modules/next/dist/bin/next",
            args: "start -p 3000",
            env: {
                NODE_ENV: "production",
                VITE_BASE_URL: "https://bsmarket.uz/api"
            },
        },
    ],
};  
