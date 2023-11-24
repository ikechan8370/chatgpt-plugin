import { getEncoding } from 'js-tiktoken';
// TODO: make this configurable
var tokenizer = getEncoding('cl100k_base');
export function encode(input) {
    return new Uint32Array(tokenizer.encode(input));
}
