/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove experimental.serverActions (no longer needed in Next 14)
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
