export interface OrderConfirmationItem {
  name: string;
  variantName?: string | null;
  imageUrl?: string | null;
  quantity: number;
  totalPrice: number;
}
export interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  to: string;
  totalAmount: number;
  statusUrl: string;
  items: OrderConfirmationItem[];
}
function escape(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function imageURL(value: string | null | undefined, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function variantLabel(name: string, variant?: string | null): string {
  const label = variant?.trim() || '';
  const title = name.trim();
  if (label.toLowerCase() === title.toLowerCase()) return '';
  for (const separator of [' — ', ' – ', ' - ']) {
    const prefix = title + separator;
    if (label.toLowerCase().startsWith(prefix.toLowerCase())) return label.slice(prefix.length).trim();
  }
  return label;
}
export function renderOrderConfirmation(args: OrderConfirmation, storeName: string): string {
  const money = (value: number) => '$' + value.toFixed(2);
  const rows = args.items.map(item => {
    const image = imageURL(item.imageUrl, args.statusUrl);
    const variant = variantLabel(item.name, item.variantName);
    return '<tr>' +
      '<td width="72" valign="top" style="width:72px;padding:16px 12px 16px 0;border-bottom:1px solid #e8e8e8;">' +
      (image ? '<img src="' + escape(image) + '" alt="' + escape(item.name) + '" width="60" height="72" style="display:block;width:60px;height:72px;object-fit:contain;border:0;background:#f6f6f6;border-radius:4px;" />' : '<div style="width:60px;height:72px;background:#f6f6f6;border-radius:4px;"></div>') + '</td>' +
      '<td valign="top" style="padding:16px 12px 16px 0;border-bottom:1px solid #e8e8e8;word-break:break-word;">' +
      '<p style="margin:0;font-size:14px;font-weight:600;line-height:1.5;color:#111;">' + escape(item.name) + '</p>' +
      (variant ? '<p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#666;">' + escape(variant) + '</p>' : '') +
      '<p style="margin:6px 0 0;font-size:12px;color:#666;">Qty: ' + item.quantity + '</p></td>' +
      '<td width="72" valign="top" align="right" style="width:72px;padding:16px 0;border-bottom:1px solid #e8e8e8;font-size:14px;font-weight:600;white-space:nowrap;color:#111;">' + money(item.totalPrice) + '</td></tr>';
  }).join('');
  return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /><meta charset="utf-8" /></head>' +
    '<body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e8e8e8;border-radius:8px;"><tr><td style="padding:24px 20px;">' +
    '<p style="margin:0 0 20px;font-size:15px;font-weight:700;letter-spacing:2px;">' + escape(storeName) + '</p>' +
    '<h1 style="font-size:24px;line-height:1.3;margin:0 0 8px;">Thanks for your order</h1>' +
    '<p style="margin:0 0 24px;font-size:13px;color:#666;">Order ' + escape(args.orderNumber) + '</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:fixed;">' + rows + '</table>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-top:16px;"><tr><td style="padding:4px 0;color:#666;">Shipping</td><td align="right" style="padding:4px 0;color:#666;">Calculated at fulfillment</td></tr>' +
    '<tr><td style="padding:12px 0;font-size:17px;font-weight:700;">Order total</td><td align="right" style="padding:12px 0;font-size:17px;font-weight:700;">' + money(args.totalAmount) + '</td></tr></table>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;"><tr><td bgcolor="#111111" style="border-radius:6px;"><a href="' + escape(args.statusUrl) + '" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">View your order</a></td></tr></table>' +
    '<p style="margin:0;font-size:13px;line-height:1.7;color:#666;">Your card is authorized now and charged when your order ships. Shipping is calculated at fulfillment. Your tracking link will appear on your order page once your package is on its way.</p>' +
    '<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e8e8e8;font-size:12px;color:#888;">' + escape(storeName) + '</p>' +
    '</td></tr></table></td></tr></table></body></html>';
}
