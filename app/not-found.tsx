import Image from "next/image";
import Link from "next/link";
import React from "react";

const Page = () => {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
      <Image
        src="/images/404_fruits_bg.webp"
        fill
        alt="404"
        className="opacity-40 object-contain"
      />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-[12vw] font-bold text-orange-500">
          <span className="inline-block rotate-3">4</span>
          <span className="inline-block -rotate-4">0</span>
          <span className="inline-block -rotate-6">4</span>
        </h3>

        <div className="flex items-center gap-2 text-xl">
          <p className="text-gray-500">
            The page you're looking for doesn't exist.
          </p>

          <Link href="/" className="text-orange-600 transition hover:underline">
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Page;
