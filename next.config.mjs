/** @type {import('next').NextConfig} */
const nextConfig = {
    // Prevent Next.js from bundling heavy Node-only packages for server components
    serverExternalPackages: [
        "ffmpeg-static",
        "mongodb",
        "@google/genai",
        "@anthropic-ai/sdk",
        "openai",
        "socket.io",
        "bcryptjs",
        "jsonwebtoken",
    ],

    turbopack: {},

    // Cache-Control headers for served videos
    async headers() {
        return [
            {
                source: "/videos/:path*",
                headers: [
                    { key: "Cache-Control", value: "public, max-age=31536000" },
                    { key: "Accept-Ranges", value: "bytes" },
                ],
            },
        ];
    },
};

export default nextConfig;
