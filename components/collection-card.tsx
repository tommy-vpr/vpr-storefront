import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { Collection } from "@/lib/wms/types";

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link href={`/collections/${collection.slug}`} className="group block">
      <Card className="transition hover:border-foreground/30 hover:shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-medium leading-tight group-hover:underline">
              {collection.name}
            </h3>
            {collection.featured && (
              <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                Featured
              </span>
            )}
          </div>
          {collection.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {collection.description}
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            {collection.productCount}{" "}
            {collection.productCount === 1 ? "product" : "products"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
