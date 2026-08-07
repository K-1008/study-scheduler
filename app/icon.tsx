import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// PNG画像を用意する代わりに、ビルド時に生成する
export default function Icon() {
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
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        復
      </div>
    ),
    size,
  );
}
