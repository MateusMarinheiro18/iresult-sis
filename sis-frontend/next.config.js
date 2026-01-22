/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['jsonwebtoken'],
  
  // Configurar headers para permitir acesso aos uploads
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Garantir que a pasta public seja copiada corretamente
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

module.exports = nextConfig;
