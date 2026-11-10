import { Clock, CreditCard, Package, RotateCcw, ShieldCheck, Star, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Benefit, BenefitIcon } from "@/lib/homepage-defaults";

const ICONS: Record<BenefitIcon, LucideIcon> = { truck: Truck, rotate: RotateCcw, card: CreditCard, shield: ShieldCheck, clock: Clock, star: Star, package: Package };

/** Site → Homepage → Benefits. */
export function BenefitsSection({ items }: { items: Benefit[] }) {
  if (!items.length) return null;
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {items.map(({ icon, title, description }) => {
        const Icon = ICONS[icon] ?? Truck;
        return (
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
        );
      })}
    </section>
  );
}
