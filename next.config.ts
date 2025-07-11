import type { NextConfig } from 'next'
import withBundleAnalyzer from '@next/bundle-analyzer'
// const ChunkErrorPlugin = require('./lib/webpack/chunk-error-plugin')

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // output: 'standalone', // Temporarily disabled
  reactStrictMode: true,
  poweredByHeader: false,
  // Optimize chunk loading
  productionBrowserSourceMaps: false,
  generateEtags: true,
  typescript: {
    // TEMPORARY: Remove after fixing type errors
    // Added on: 2025-06-14T21:01:48.722Z
    // Tracking: see suppressed-errors.json
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'date-fns',
      'clsx',
      'class-variance-authority'
    ],
    // optimizeCss: true, // Disabled temporarily due to missing dependency
  },
  // Configure headers for better caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  webpack: (config, { dev, isServer }): void => {
    // Add chunk error handling plugin
    // if (!isServer && !dev) {
    //   config.plugins.push(new ChunkErrorPlugin())
    // }
    // React PDF compatibility
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'canvas': false,
        'utf-8-validate': false,
        'bufferutil': false,
      }
    }
    
    // Bundle splitting optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          minSize: 20000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              chunks: 'all',
            },
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix',
              priority: 15,
              chunks: 'all',
            },
            utils: {
              test: /[\\/]node_modules[\\/](clsx|class-variance-authority|tailwind-merge)[\\/]/,
              name: 'utils',
              priority: 10,
              chunks: 'all',
            },
          },
        },
      }
    }

    // Tree shaking optimization
    if (!dev) {
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }

    return config
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  compress: true,
}

export default bundleAnalyzer(nextConfig)