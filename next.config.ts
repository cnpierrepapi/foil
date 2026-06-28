import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray package-lock.json in the home directory
  // otherwise makes Next infer the wrong root and fail module resolution.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
