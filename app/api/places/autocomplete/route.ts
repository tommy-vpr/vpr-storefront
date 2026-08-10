import { NextResponse } from "next/server";

/**
 * Address autocomplete proxy.
 *
 * The Google key stays SERVER-SIDE. It is deliberately not NEXT_PUBLIC: a key
 * in the browser is a key anyone can lift and bill to this account, and Places
 * is billed per session. Restricting a public key by HTTP referrer is possible
 * but weaker than simply never shipping it.
 *
 * Mirrors the WMS's /places routes (same field masks, same US restriction, same
 * output shape) rather than calling them — those sit behind a staff JWT and a
 * guest at checkout has none.
 *
 * SESSION TOKENS matter for cost, not correctness: Google bills a session as
 * the keystrokes PLUS the one details call that follows, so the client must
 * hold one token per address the customer enters and mint a fresh one after
 * each selection. Without it every keystroke bills separately.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOOGLE_AUTOCOMPLETE =
  "https://places.googleapis.com/v1/places:autocomplete";

/** Below this, suggestions are noise and the request is pure cost. */
const MIN_INPUT_LENGTH = 4;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // 503, not 500: the form treats this as "autocomplete unavailable" and
    // falls back to plain typing rather than blocking checkout.
    return NextResponse.json(
      { error: "Places not configured" },
      { status: 503 },
    );
  }

  let body: { input?: unknown; sessionToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  const sessionToken =
    typeof body.sessionToken === "string" ? body.sessionToken : "";

  if (input.length < MIN_INPUT_LENGTH || input.length > 200) {
    return NextResponse.json({ suggestions: [] });
  }
  if (!UUID_RE.test(sessionToken)) {
    return NextResponse.json({ error: "bad_session" }, { status: 400 });
  }

  try {
    const res = await fetch(GOOGLE_AUTOCOMPLETE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId," +
          "suggestions.placePrediction.text," +
          "suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        includedRegionCodes: ["us"],
        languageCode: "en",
        regionCode: "us",
      }),
    });

    if (!res.ok) {
      console.error("[places] autocomplete failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ suggestions: [] });
    }

    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string;
          text?: { text: string };
          structuredFormat?: {
            mainText?: { text: string };
            secondaryText?: { text: string };
          };
        };
      }>;
    };

    const suggestions = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
        placeId: p.placeId,
        mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
      }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    // Never fail the checkout over a suggestion list.
    console.error("[places] autocomplete threw", err);
    return NextResponse.json({ suggestions: [] });
  }
}
