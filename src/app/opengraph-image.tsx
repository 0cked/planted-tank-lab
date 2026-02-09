import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          background:
            "linear-gradient(135deg, rgb(240, 253, 250) 0%, rgb(224, 231, 255) 50%, rgb(255, 247, 237) 100%)",
          color: "#0a0a0a",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>
          PlantedTankLab
        </div>
        <div style={{ marginTop: 16, fontSize: 30, color: "#404040" }}>
          Compatibility-first planning for planted aquariums
        </div>
        <div style={{ marginTop: 40, fontSize: 20, color: "#525252" }}>
          Build, compare, and verify compatibility.
        </div>
      </div>
    ),
    size,
  );
}

