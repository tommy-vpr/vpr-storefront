import { NextResponse } from "next/server";

/**
 * Place details → the address fields the checkout form actually holds.
 *
 * Returns the SAME shape as the WMS's /places/details, so the two stay
 * interchangeable if this ever moves behind the WMS.
 *
 * state comes back as the short text ("CA", not "California") because that is
 * what ShipEngine wants downstream and what the form's 2-char state input
 * expects. country likewise.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOOGLE_DETAILS = "https://places.googleapis.com/v1/places";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface GoogleAddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

function pick(
  components: GoogleAddressComponent[],
  type: string,
  field: "longText" | "shortText" = "longText",
): string {
  const c = components.find((x) => x.types.includes(type));
  return c ? c[field] : "";
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Places not configured" },
      { status: 503 },
    );
  }

  let body: { placeId?: unknown; sessionToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const placeId = typeof body.placeId === "string" ? body.placeId : "";
  const sessionToken =
    typeof body.sessionToken === "string" ? body.sessionToken : "";

  if (!placeId || placeId.length > 300) {
    return NextResponse.json({ error: "bad_place" }, { status: 400 });
  }
  if (!UUID_RE.test(sessionToken)) {
    return NextResponse.json({ error: "bad_session" }, { status: 400 });
  }

  try {
    const url =
      `${GOOGLE_DETAILS}/${encodeURIComponent(placeId)}` +
      `?sessionToken=${encodeURIComponent(sessionToken)}`;

    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "formattedAddress,addressComponents",
      },
    });

    if (!res.ok) {
      console.error("[places] details failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const data = (await res.json()) as {
      formattedAddress?: string;
      addressComponents?: GoogleAddressComponent[];
    };
    const components = data.addressComponents ?? [];

    const streetNumber = pick(components, "street_number");
    const route = pick(components, "route");

    return NextResponse.json({
      address1: [streetNumber, route].filter(Boolean).join(" "),
      address2: pick(components, "subpremise") || "",
      city:
        pick(components, "locality") ||
        pick(components, "postal_town") ||
        pick(components, "sublocality_level_1") ||
        "",
      state: pick(components, "administrative_area_level_1", "shortText"),
      zip: pick(components, "postal_code"),
      country: pick(components, "country", "shortText") || "US",
      formattedAddress: data.formattedAddress ?? "",
    });
  } catch (err) {
    console.error("[places] details threw", err);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
