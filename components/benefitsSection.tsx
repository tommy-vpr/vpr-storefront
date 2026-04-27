import { CreditCard, RotateCcw, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Edit these to customize the benefit cards shown on the home page.
const BENEFITS: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: RotateCcw,
    title: "90-Day Buy Back",
    description:
      "Enjoy stress-free ordering with our 90-day buy back policy. Your satisfaction is guaranteed, making your purchase risk-free.",
  },
  {
    icon: Truck,
    title: "Free Shipping",
    description:
      "No need to worry about additional shipping charges. Enjoy the convenience of free shipping on all orders placed with us.",
  },
  {
    icon: CreditCard,
    title: "No Credit Card Fees",
    description:
      "Shop without worrying about extra fees — our no credit card fee policy ensures simple, transparent transactions for all.",
  },
];

export function BenefitsSection() {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {BENEFITS.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="flex items-start gap-4 rounded-2xl border bg-card p-6"
        >
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center 
          rounded-full bg-foreground text-background"
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold leading-tight">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
