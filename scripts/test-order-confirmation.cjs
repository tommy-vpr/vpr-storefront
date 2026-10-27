const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../lib/order-confirmation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const context = { exports: {}, URL }; vm.runInNewContext(code, context);
const { renderOrderConfirmation } = context.exports;
const input = { orderId: 'order-1', orderNumber: 'SF-VPR-000001', to: 'buyer@example.test', totalAmount: 30, statusUrl: 'https://vpr.example.test/orders/token', items: [{ name: 'Skwezed Watermelon', variantName: 'Skwezed Watermelon', imageUrl: '/images/product.png', quantity: 2, totalPrice: 30 }] };
test('receipt contains a catalog thumbnail, quantity and authoritative total without duplicate name', () => {
 const html = renderOrderConfirmation(input, 'VPR Collection');
 assert.ok(html.includes('src="https://vpr.example.test/images/product.png"'));
 assert.ok(html.includes('Qty: 2'));
 assert.equal((html.match(/>Skwezed Watermelon</g) || []).length, 1);
 assert.equal((html.match(/\$30.00/g) || []).length, 2);
 assert.ok(html.includes('VPR Collection')); assert.ok(!html.includes('LITTO'));
});
test('distinct variants render once without the product-name prefix', () => {
 const html = renderOrderConfirmation({ ...input, items: [{ ...input.items[0], variantName: 'Skwezed Watermelon — 3mg' }] }, 'VPR Collection');
 assert.ok(html.includes('>3mg</p>')); assert.ok(!html.includes('Skwezed Watermelon — 3mg'));
});
test('untrusted names are escaped and non-web images are omitted', () => {
 const html = renderOrderConfirmation({ ...input, items: [{ ...input.items[0], name: '<script>bad()</script>', imageUrl: 'javascript:bad()' }] }, 'VPR Collection');
 assert.ok(!html.includes('<script>')); assert.ok(!html.includes('javascript:'));
 assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
});
test('missing catalog image still renders the item and order status link', () => {
 const html = renderOrderConfirmation({ ...input, items: [{ ...input.items[0], imageUrl: null }] }, 'VPR Collection');
 assert.ok(!html.includes('<img')); assert.ok(html.includes('Skwezed Watermelon'));
 assert.ok(html.includes('href="https://vpr.example.test/orders/token"'));
});
