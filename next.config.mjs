/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Image optimization server-side ishlashini developmentda ham yoqadi, productionda o‘chadi
    loader: "default",
    path: "/_next/image",
    unoptimized: true, // ✅ Productionda backenddan keladigan rasmlar ham ishlaydi

    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // Rasmlarni olishga ruxsat berilgan domenlar
    domains: ["bsmarket.uz", "mini-io-api.texnomart.uz"],

    // Rasmlar uchun optimizatsiya formatlari
    formats: ["image/avif", "image/webp"],

    // Device size va imageSizes sozlamalari
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Remote patternlar (backend rasmlari)
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5342",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5342",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "bsmarket.uz",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5342",
        pathname: "/api/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5342",
        pathname: "/api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "bsmarket.uz",
        pathname: "/api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "reclam.ca",
      },
      {
        protocol: "https",
        hostname: "cdn-icons-png.flaticon.com",
      },
    ],
  },

  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": process.cwd(),
    };

    if (dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        tls: false,
        net: false,
        fs: false,
      };
    }

    return config;
  },

  turbopack: {
    resolveAlias: {
      "@": process.cwd(),
    },
  },

  async headers() {
    return [
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "Accept-Encoding", value: "gzip, deflate, br" },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  serverExternalPackages:
    process.env.NODE_ENV === "development" ? ["https"] : [],

  experimental: {
    optimizeCss: false,
    scrollRestoration: true,
  },
};

export default nextConfig;
