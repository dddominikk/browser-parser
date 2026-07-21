import type { Parser, ParserPageContext } from './contracts.ts';
import { asanaParser } from './parsers/asana.ts';

const builtInParsers: readonly Parser<unknown>[] = Object.freeze([asanaParser]);
const extensions: Parser<unknown>[] = [];

export function registerParser(parser: Parser<unknown>): void {
    extensions.push(parser);
}

export function selectParser(page: ParserPageContext): Parser<unknown> | undefined {
    const snapshot = [...builtInParsers, ...extensions];
    return snapshot.find(parser => parser.matches(page));
}
