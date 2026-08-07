import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FSRSオプティマイザはRust製のネイティブモジュール。バンドルせず
  // そのまま require させないと実行時に読み込めない。
  serverExternalPackages: ["@open-spaced-repetition/binding"],
};

export default nextConfig;
