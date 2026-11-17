/** Free shipping is a VPR business rule, not browser-supplied pricing. */
export function vprFreeShipping(expectedTotalCents: number) {
  return { enabled: true, flatRateCents: 0, freeShippingThresholdCents: null, method: 'Free Shipping', deliveryEstimate: '', allowFreeInternational: true, expectedTotalCents };
}
