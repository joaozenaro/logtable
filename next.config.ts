import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    env: {
        WORK_ITEM_URL: process.env.WORK_ITEM_URL,
    },
};

export default nextConfig;
