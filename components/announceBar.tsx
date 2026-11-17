import Link from "next/link";
import { Package } from "lucide-react";

/** Site → Site settings → Announcement. Renders nothing when disabled. */
const AnnouceBar = ({ text, href, enabled = true }: { text: string; href?: string | null; enabled?: boolean }) => {
  if (!enabled || !text) return null;
  const body = (
    <>
      <Package className="h-4 w-4" /> {text}
    </>
  );
  const className = "w-full p-3 flex gap-2 justify-center items-center text-gray-200 bg-gray-950 text-xs font-semibold";
  return href ? (
    <Link href={href} className={`${className} hover:text-white`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
};

export default AnnouceBar;
