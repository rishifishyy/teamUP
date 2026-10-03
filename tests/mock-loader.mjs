import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  if (result.url.startsWith('file:')) {
    const path = fileURLToPath(result.url).replaceAll('\\', '/');
    if (path.endsWith('/server/db.js')) return { url: new URL('./mock-db.mjs', import.meta.url).href, shortCircuit: true };
    if (path.endsWith('/server/email.js')) return { url: new URL('./mock-email.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === 'razorpay') return { url: new URL('./mock-razorpay.mjs', import.meta.url).href, shortCircuit: true };
  return result;
}
