/** @type {import('next').NextConfig} */

// Read the version from changelog.json at BUILD TIME so the displayed
// version always matches the deployment — regardless of runtime caching.
let appVersion = '—'
try {
  const changelog = require('./data/changelog.json')
  appVersion = changelog[0]?.version || '—'
} catch {}

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
}

module.exports = nextConfig
