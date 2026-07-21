import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Contact Us | VPR Collection",
  description: "Get in touch with the VPR Collection team.",
};

export default function ContactPage() {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="rounded-xl p-8 shadow-2xl shadow-gray-400/20 border border-gray-100">
        <h1 className="mb-4 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Contact Us
        </h1>

        <p className="mb-8 text-muted-foreground">
          Questions about an order, wholesale pricing, or our 90 day buy back
          guarantee? Send us a message and we&apos;ll get back to you. You can
          also reach us at{" "}
          <Link
            href="mailto:info@vprcollection.com"
            className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            info@vprcollection.com
          </Link>
          .
        </p>

        {/* JotForm embed — renders into the DOM at this position */}
        <iframe
          src="https://form.jotform.com/242285985260060"
          width="100%"
          height="900"
          frameBorder="0"
          style={{ border: 0 }}
          allow="geolocation; microphone; camera; fullscreen"
          title="Contact Form"
        />
      </div>
    </section>
  );
}
