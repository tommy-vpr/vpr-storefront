/**
 * Breaks a child out of the centred `container` in (shop)/layout.tsx to span
 * the full viewport width.
 *
 * The margin trick rather than a portal or restructuring the layout: the
 * element stays exactly where it is in the document, so it keeps its place in
 * the flow and needs no coordination with anything above it.
 *
 *   50% of the CONTAINER, minus 50% of the VIEWPORT, applied as negative
 *   margin on both sides — which is precisely the gap between the two.
 *
 * `100vw` and not `100%`: the container's width is the thing being escaped, so
 * measuring against it would be circular.
 *
 * Note 100vw INCLUDES the scrollbar on desktop Chrome/Edge, which is why the
 * page also sets `scrollbar-gutter: stable` — without it a full-bleed element
 * is ~15px wider than the visible area and the page scrolls sideways.
 */
export function FullBleed({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen ${className}`}
    >
      {children}
    </div>
  );
}
