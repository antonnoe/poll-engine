/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // /raadplegingen mag in een iframe op nederlanders.fr geladen worden.
        source: '/raadplegingen',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://nederlanders.fr https://www.nederlanders.fr",
          },
          // Bewust GEEN X-Frame-Options: DENY/SAMEORIGIN (zou framing blokkeren).
        ],
      },
    ];
  },
};

module.exports = nextConfig;
