import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vandilson Neto — Site Oficial";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#030509",
          backgroundImage:
            "radial-gradient(ellipse 75% 65% at 50% 115%, rgba(201,204,210,0.28) 0%, rgba(74,78,86,0.16) 45%, rgba(3,5,9,0) 78%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 180,
            height: 180,
            borderRadius: 999,
            border: "2px solid rgba(201,204,210,0.85)",
            boxShadow: "0 0 80px rgba(201,204,210,0.30)",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              backgroundColor: "#101216",
              backgroundImage:
                "radial-gradient(circle at 35% 30%, #3a3a3a 0%, #101216 70%)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 88,
            color: "#f4f1ea",
            letterSpacing: "-0.02em",
          }}
        >
          Vandilson Neto
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 26,
            color: "#c6cad0",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
          }}
        >
          Sons que atravessam o mundo
        </div>
      </div>
    ),
    { ...size },
  );
}
