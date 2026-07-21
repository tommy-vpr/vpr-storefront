import type { Metadata } from "next";
import JotFormEmbed from "@/components/JotFormEmbed";

export const metadata: Metadata = {
  title: "Wholesale Application | VPR Collection",
  description: "Apply for a VPR Collection wholesale account.",
};

export default function WholesaleApplicationPage() {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="rounded-xl p-8 shadow-2xl shadow-gray-400/20 border border-gray-100">
        <h1 className="mb-4 text-4xl font-bold uppercase">
          Wholesale Application
        </h1>

        <p className="mb-8 text-muted-foreground">
          Complete the application below and our team will review it shortly.
        </p>

        <JotFormEmbed formId="220456186230147" title="(VPR) Account Details" />
      </div>
    </section>
  );
}
