import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Add any custom config options here
  turbopack: {
    // Explicitly set the project root to avoid Turbopack workspace detection warnings
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
