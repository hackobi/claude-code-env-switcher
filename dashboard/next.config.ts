import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
