import { CollectionCard } from "@/components/collection-card";
import { getClient, isLoggedIn } from "@/lib/wms/session";
import React from "react";

const page = async () => {
  const [{ store }, { collections }, loggedIn] = await Promise.all([
    getClient().getStore(),
    getClient().getCollections(),
    isLoggedIn(),
  ]);

  return (
    <section
      id="collections"
      className="container mx-auto p-4 lg:p-12 min-h-[56vh]"
    >
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Collections</h2>
      </div>

      {collections.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No collections available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}
    </section>
  );
};

export default page;
