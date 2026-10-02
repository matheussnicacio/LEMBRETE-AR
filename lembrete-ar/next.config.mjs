/** @type {import('next').NextConfig} */
const nextConfig = { poweredByHeader: false, experimental: { serverComponentsExternalPackages: ["nodemailer"] } };
export default nextConfig;
