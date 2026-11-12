import type { Metadata } from "next";
import { getClient } from "@/lib/wms/session";
import "../globals.css";
import { Geist } from "next/font/google";
import { getAgeVerification } from "@/lib/age-verification";
import { AgeVerification } from "@/components/age-verification";

const geist = Geist({
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const client = await getClient();
    const { store } = await client.getStore();

    return {
      title: store.name,
      description: `${store.name} wholesale storefront`,
      icons: {
        icon: "/images/vpr-fav-icon.png",
      },
    };
  } catch {
    return {
      title: "Storefront",
      icons: {
        icon: "/images/vpr-fav-icon.png",
      },
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 21+ gate wraps every storefront and auth page (Site → Age verification).
  const ageVerification = await getAgeVerification();
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AgeVerification settings={ageVerification}>{children}</AgeVerification>
      </body>
    </html>
  );
}
