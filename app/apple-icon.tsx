import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS のホーム画面用。角丸はOS側で付くので背景は全面に塗る
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
          color: "#ffffff",
          fontSize: 108,
          fontWeight: 700,
        }}
      >
        復
      </div>
    ),
    size,
  );
}
