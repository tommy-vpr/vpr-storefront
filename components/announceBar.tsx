import React from "react";
import { Package } from "lucide-react";

const AnnouceBar = () => {
  return (
    <div
      className="w-full p-3 flex gap-2 justify-center items-center text-gray-200 bg-gray-950
    text-xs font-semibold"
    >
      <Package className="h-4 w-4" /> Free Shipping On Every Order!
    </div>
  );
};

export default AnnouceBar;
