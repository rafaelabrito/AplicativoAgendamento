import { TextEncoder, TextDecoder } from 'util';
const globalObj = globalThis as typeof globalThis & {
  TextEncoder?: typeof TextEncoder;
  TextDecoder?: typeof TextDecoder;
};

if (typeof globalObj.TextEncoder === 'undefined') {
  globalObj.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalObj.TextDecoder === 'undefined') {
  globalObj.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
