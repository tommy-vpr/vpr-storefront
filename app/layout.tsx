import type { Metadata } from "next";
import { getClient } from "@/lib/wms/session";
import "./globals.css";
import { Geist } from "next/font/google";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
