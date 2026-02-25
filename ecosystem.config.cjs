module.exports = {
    apps: [
        {
            name: "next-app",
            script: "./node_modules/next/dist/bin/next",
            args: "start -p 3000",
            env: {
                NODE_ENV: "production",
                NEXT_PUBLIC_API_URL: "https://bsmarket.uz/api"
            },
        },
    ],
};  