"use server";

import { redirect } from "next/navigation";
import { clearSessionToken } from "@/lib/wms/session";

export async function logoutAction() {
  await clearSessionToken();
  redirect("/login");
}
