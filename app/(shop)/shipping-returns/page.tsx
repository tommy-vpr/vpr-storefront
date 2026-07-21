import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shipping & Returns | VPR Collection",
  description: "Shipping timelines and our 90 day buy back guarantee.",
};

export default function ShippingReturnsPage() {
  return (
    <main className="container mx-auto h-screen max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="mb-8 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        Shipping and Returns
      </h1>

      <div className="space-y-8 text-muted-foreground">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            Shipping
          </h2>
          <p className="leading-relaxed">
            Orders received on a business day before 3:00pm PST are usually
            shipped the same day. Any orders after the deadline are usually
            shipped the next available business day. Tracking numbers will be
            sent to the email address on the account once shipped.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            90 Day Buy Back Guarantee
          </h2>
          <p className="leading-relaxed">
            If, for any reason, you are not satisfied with your order, we offer
            a 90 day buy back guarantee. Please contact us at{" "}
            <Link
              href="mailto:info@vprcollection.com"
              className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
            >
              info@vprcollection.com
            </Link>{" "}
            within 90 days from the date of the last invoice with your concerns
            and we will buy back your order.
          </p>
        </section>
      </div>
    </main>
  );
}
