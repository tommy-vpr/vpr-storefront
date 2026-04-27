import React from "react";

const Hero = () => {
  return (
    <section className="h-[36vh] mb-12 flex flex-col items-center justify-center bg-orange-500 w-full">
      <p className="mt-4 max-w-lg text-balance text-muted-foreground">
        Wholesale catalog. Browse our collections below — sign in to see pricing
        and place orders.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row"></div>
    </section>
  );
};

export default Hero;
