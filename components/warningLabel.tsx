import React from "react";

const WarningLabel = () => {
  return (
    <section className="flex justify-center items-center p-1 lg:p-2 text-[2.5vw] font-bold text-white">
      <div className="text-white p-2 md:p-4 lg:p-12 bg-gray-950 w-full flex justify-center items-center">
        <p className="flex flex-col items-center">
          <span className="leading-[100%]">
            Warning: This product contain nicotine.
          </span>
          <span className="leading-[100%]">
            Nicotine is an addictive chemical.
          </span>
        </p>
      </div>
    </section>
  );
};

export default WarningLabel;
