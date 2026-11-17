/** Site → Site settings → Warning. Renders nothing when disabled. */
const WarningLabel = ({ line1, line2, enabled = true }: { line1: string; line2?: string | null; enabled?: boolean }) => {
  if (!enabled || !line1) return null;
  return (
    <section className="flex justify-center items-center p-1 lg:p-2 text-[2.5vw] font-bold text-white">
      <div className="text-white p-2 md:p-4 lg:p-12 bg-gray-950 w-full flex justify-center items-center">
        <p className="flex flex-col items-center">
          <span className="leading-[100%]">{line1}</span>
          {line2 ? <span className="leading-[100%]">{line2}</span> : null}
        </p>
      </div>
    </section>
  );
};

export default WarningLabel;
