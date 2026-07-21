import Link from "next/link";
import { Phone, Clock, Mail, ChevronDown } from "lucide-react";

const QUICK_LINKS = [
  { label: "Pact Act", href: "/pact-app", external: false },
  {
    label: "Wholesale App",
    href: "/wholesale-application",
    external: false,
  },
  {
    label: "Skwezed Retail Site",
    href: "https://www.skwezed.com/",
    external: true,
  },
];

const CUSTOMER_SERVICE = [
  { label: "Partnership Support", href: "/partnership-support" },
  { label: "Shipping & Return", href: "/shipping-returns" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Contact Us", href: "/contact" },
];

function LinkItem({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const className = "text-sm transition hover:text-gray-700";
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** A footer column that collapses into an accordion on mobile and is
 *  always open on desktop (md+). Uses native <details> — no JS needed. */
function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-white/10 md:border-none" open>
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 md:cursor-default md:py-0">
        <h3 className="text-base font-semibold">{title}</h3>
        <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180 md:hidden" />
      </summary>
      <ul className="flex flex-col gap-2 pb-4 pt-1 md:pb-0 md:pt-4">
        {children}
      </ul>
    </details>
  );
}

export function Footer() {
  return (
    <footer className="bg-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title="Quick Links">
            {QUICK_LINKS.map((l) => (
              <li key={l.label}>
                <LinkItem href={l.href} external={l.external}>
                  {l.label}
                </LinkItem>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Customer Service">
            {CUSTOMER_SERVICE.map((l) => (
              <li key={l.label}>
                <LinkItem href={l.href}>{l.label}</LinkItem>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Contact">
            <li>
              <a
                href="tel:+16266980098"
                className="flex items-center gap-2 text-sm transition hover:text-gray-700"
              >
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>(626) 698-0098</span>
              </a>
            </li>
            <li>
              <div className="flex items-start gap-2 text-sm ">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Monday - Friday
                  <br />
                  10:00a-5:00p PST
                </span>
              </div>
            </li>
            <li>
              <a
                href="mailto:info@vprcollection.com"
                className="flex items-center gap-2 text-sm transition hover:text-gray-700"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>Info@vprcollection.com</span>
              </a>
            </li>
          </FooterColumn>

          {/* Newsletter / signup form */}
          <div>
            <iframe
              title="Newsletter signup"
              src="https://form.jotform.com/240252043265446"
              className="h-64 w-full"
            />
          </div>
        </div>

        <div className="mt-10 text-[13px] leading-relaxed text-gray-500">
          Not for Sale for Minors — Products sold on this site may contain
          nicotine which is a highly addictive substance. California Proposition
          65 - WARNING: This product can expose you to chemicals including
          nicotine, which is known to the State of California to cause birth
          defects or other reproductive harm. For more information, go to{" "}
          <a
            href="https://www.p65warnings.ca.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#58a6ff] hover:underline"
          >
            Proposition 65 Warnings Website
          </a>
          . Products sold on this site is intended for adult smokers. You must
          be of legal smoking age in your territory to purchase products. Please
          consult your physician before use. E-Juice on our site may contain
          Propylene Glycol and/or Vegetable Glycerin, Nicotine and Flavorings.
          Our products may be poisonous if orally ingested. FDA DISCLAIMER: The
          statements made regarding these products have not been evaluated by
          the Food and Drug Administration. The efficacy of these products has
          not been confirmed by FDA-approved research. These products are not
          intended to diagnose, treat, cure or prevent any disease. All
          information presented here is not meant as a substitute for or
          alternative to information from health care practitioners. For their
          protection, please keep out of reach of children and pets. Read our
          terms and conditions page before purchasing our products. Use All
          Products On This Site At Your Own Risk!
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-gray-400">
          VPR Collection&copy;{new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
