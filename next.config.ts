import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "@napi-rs/canvas",
    "tesseract.js",
    "tesseract.js-core",
    "@tesseract.js-data/eng",
    "@tesseract.js-data/vie",
  ],
};

export default nextConfig;
