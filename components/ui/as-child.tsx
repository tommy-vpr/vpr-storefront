import * as React from "react"

/**
 * Compatibility shim: `asChild` -> Base UI's `render` prop.
 *
 * Radix (and shadcn/ui, which these components came from) composes with
 * `asChild`: the component merges its props onto its single child instead of
 * rendering its own element.
 *
 * Base UI does the same job with a `render` prop, and does NOT understand
 * `asChild`. When `asChild` reaches a Base UI component it is not consumed —
 * it falls through to the DOM as an unknown attribute, and the component
 * still renders its own element. That produces two failures at once:
 *
 *   1. React warns "React does not recognize the `asChild` prop on a DOM
 *      element."
 *   2. The intended composition never happens, so you get nested elements —
 *      e.g. <DropdownMenuTrigger asChild><Button> yields <button><button>,
 *      which is invalid HTML and fails hydration.
 *
 * This helper translates one to the other so existing `asChild` call sites
 * keep working unchanged.
 *
 * Usage:
 *   function Thing({ asChild, render, ...props }: Props & AsChildProps) {
 *     return <Primitive render={resolveRender(asChild, render, props.children)} {...props} />
 *   }
 */

export interface AsChildProps {
  /**
   * Merge this component's props onto its child element rather than
   * rendering its own element. Equivalent to Base UI's `render`.
   */
  asChild?: boolean
}

/**
 * Returns the `render` value Base UI expects.
 *
 * - An explicit `render` always wins; `asChild` is only a fallback spelling.
 * - With `asChild` and a single valid element child, that child becomes the
 *   rendered element.
 * - Otherwise returns undefined, so the component renders its default element.
 *
 * When this returns an element, the caller must ALSO stop passing `children`
 * to the primitive — the child is now the rendered element itself, and
 * passing it twice would render it inside itself.
 */
export function resolveRender<R>(
  asChild: boolean | undefined,
  // Base UI's `render` accepts an element OR a render function; this helper
  // is agnostic and passes either through untouched.
  render: R | undefined,
  children: React.ReactNode,
): R | React.ReactElement | undefined {
  if (render) return render
  if (!asChild) return undefined

  if (React.isValidElement(children)) return children

  // asChild with zero or multiple children is a call-site mistake. Fall back
  // to the default element rather than throwing — a rendering glitch is
  // preferable to taking down the page.
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[asChild] expected exactly one React element child; " +
        "rendering the default element instead.",
    )
  }
  return undefined
}
