/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Slike su placeholderi (lokalni / data URI) pa nije potrebna remote konfiguracija.
  experimental: {
    // Predlošci pozivnica učitavaju se kroz server action (slika do 4 MB),
    // a zadana granica tijela zahtjeva je 1 MB.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
