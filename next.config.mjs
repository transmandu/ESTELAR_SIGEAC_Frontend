const storageBaseUrl = process.env.NEXT_PUBLIC_STORAGE_BASE_URL
  ? new URL('/', process.env.NEXT_PUBLIC_STORAGE_BASE_URL)
  : null;

// Redeploy trigger: proyecto de Vercel recreado (2026-08-31).
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api-etr.sigeac.org',
      },
      {
        protocol: 'http',
        hostname: '172.190.0.166',
        port: '81',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '81',
      },
      ...(storageBaseUrl
        ? [
            {
              protocol: storageBaseUrl.protocol.slice(0, -1), // Remove the trailing ':'
              hostname: storageBaseUrl.hostname,
              port: storageBaseUrl.port || undefined,
            },
          ]
        : []),
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsHmrCache: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
};

export default nextConfig;
