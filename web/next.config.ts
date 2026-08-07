import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.25"],
};

initOpenNextCloudflareForDev();
export default nextConfig;
