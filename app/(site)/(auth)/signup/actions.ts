"use server";

import { redirect } from "next/navigation";
import { getClient, setSessionToken } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";

export interface SignupState {
  error: string | null;
}

const MIN_PASSWORD_LENGTH = 8;

export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const redirectRaw = String(formData.get("redirect") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // Checked here as well as server-side so the customer learns it before a
  // round-trip, not after.
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  let token: string;
  try {
    const res = await getClient().register({
      email,
      password,
      name: name || undefined,
    });
    token = res.token;
  } catch (err) {
    if (err instanceof WmsError) {
      // Said plainly rather than hidden. Someone who already has an account
      // needs to be sent to sign in, not left thinking they registered.
      if (err.status === 409) {
        return {
          error:
            "An account with that email already exists. Try signing in instead.",
        };
      }
      if (err.status === 400) {
        const body = err.body as { error?: string } | null;
        return { error: body?.error ?? "Please check the details and retry." };
      }
      if (err.status === 429) {
        return {
          error: "Too many attempts. Please wait a minute and try again.",
        };
      }
    }
    return { error: "Something went wrong. Please try again." };
  }

  await setSessionToken(token);

  // Same-site paths only — an open redirect here would be handed to every new
  // customer at the moment they're most likely to click through.
  const dest =
    redirectRaw.startsWith("/") && !redirectRaw.startsWith("//")
      ? redirectRaw
      : "/";
  redirect(dest);
}
