const repoBasePath = "/OrbitLive";
const isGithubActionsBuild = process.env.GITHUB_ACTIONS === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGithubActionsBuild ? repoBasePath : "",
  assetPrefix: isGithubActionsBuild ? repoBasePath : "",
};

export default nextConfig;
