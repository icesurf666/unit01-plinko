/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@plinko/shared',
    '@rainbow-me/rainbowkit',
    'wagmi',
    '@wagmi/core',
    '@wagmi/connectors',
  ],
  // monorepo inside a larger repo → set the tracing root explicitly
  outputFileTracingRoot: import.meta.dirname,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  },
  webpack: (config, { webpack }) => {
    // Optional wallet-connector deps we do not use. The whole Coinbase x402
    // payment layer (@x402/*) is never executed here — ignore it.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@react-native-async-storage/async-storage': false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
