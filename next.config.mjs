/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // wichtig! muss noch manuell ergänzt werden:
    compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
