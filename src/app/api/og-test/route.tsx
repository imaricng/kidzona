import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/** Privremena provjera radi li crtanje slika na posluzitelju. */
export async function GET() {
  try {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#ff7a59", color: "white", fontSize: 64 }}>
          proba
        </div>
      ),
      { width: 400, height: 200 },
    );
  } catch (e) {
    return new Response(`og ne radi: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`, { status: 500 });
  }
}
