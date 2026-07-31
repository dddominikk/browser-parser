import assert from 'node:assert/strict';
import test from 'node:test';
import { captureCurrentTab } from '../src/capture.ts';
import { registerParser } from '../src/registry.ts';
import type { CookieLike, ParserDocument, ParserElement, ParserPageContext } from '../src/contracts.ts';

class FakeElement implements ParserElement {
    readonly textContent: string | null;
    readonly value?: string | null;
    readonly href: string;
    private readonly attributes: Readonly<Record<string, string>>;
    private readonly children: readonly FakeElement[];

    constructor(attributes: Record<string, string> = {}, children: readonly FakeElement[] = [], textContent: string | null = null) {
        this.attributes = attributes;
        this.children = children;
        this.textContent = textContent;
        this.href = attributes.href ?? '';
    }

    getAttribute(name: string): string | null {
        return this.attributes[name] ?? null;
    }

    querySelector(selector: string): ParserElement | null {
        return this.querySelectorAll(selector)[0] ?? null;
    }

    querySelectorAll(selector: string): readonly ParserElement[] {
        if (selector === 'meta' || selector === 'link') return this.children.filter(child => child.getAttribute('data-kind') === selector);
        if (selector === '.TaskPaneBody') return this.children.filter(child => child.getAttribute('data-kind') === 'task-pane');
        if (selector === '.TaskPaneTitle textarea') return this.children.filter(child => child.getAttribute('data-kind') === 'task-title');
        return [];
    }
}

class FakeDocument implements ParserDocument {
    readonly title = 'Example title';
    readonly referrer = 'https://referrer.example/';
    readonly characterSet = 'UTF-8';
    readonly contentType = 'text/html';
    readonly readyState = 'complete';
    readonly lastModified = 'Wed, 01 Jan 2025 00:00:00 GMT';
    readonly documentElement = new FakeElement({ lang: 'en' });
    readonly cookie: string;
    private readonly elements: readonly FakeElement[];

    constructor(cookie = '', elements: readonly FakeElement[] = []) {
        this.cookie = cookie;
        this.elements = elements;
    }

    querySelector(selector: string): ParserElement | null {
        return this.querySelectorAll(selector)[0] ?? null;
    }

    querySelectorAll(selector: string): readonly ParserElement[] {
        return this.elements.filter(element => element.getAttribute('data-kind') === selector);
    }
}

function page(overrides: Partial<ParserPageContext> = {}): ParserPageContext {
    const document = overrides.document ?? new FakeDocument('', [
        new FakeElement({ 'data-kind': 'meta', name: 'description', content: 'A page' }),
        new FakeElement({ 'data-kind': 'meta', property: 'og:title', content: 'Example' }),
        new FakeElement({ 'data-kind': 'link', rel: 'canonical', href: 'https://example.test/canonical' }),
    ]);
    return {
        url: 'https://example.test/path?query=1#hash',
        host: 'example.test',
        document,
        location: {
            href: 'https://example.test/path?query=1#hash',
            origin: 'https://example.test',
            protocol: 'https:',
            host: 'example.test',
            hostname: 'example.test',
            port: '',
            pathname: '/path',
            search: '?query=1',
            hash: '#hash',
        },
        viewport: { width: 1280, height: 720 },
        devicePixelRatio: 2,
        screen: { width: 1920, height: 1080, availWidth: 1900, availHeight: 1040, colorDepth: 24, pixelDepth: 24 },
        performance: { getEntriesByType: () => [{ name: 'https://example.test/path', entryType: 'navigation', startTime: 0, duration: 42, responseEnd: 42 }] },
        cookieStore: { getAll: async () => [] },
        ...overrides,
    };
}

test('generic capture returns requested page data without a specialized match', async () => {
    const result = await captureCurrentTab({ page: page() });

    assert.equal(result.status, 'complete');
    assert.equal(result.specialized, null);
    assert.equal(result.page.url.href, 'https://example.test/path?query=1#hash');
    assert.equal(result.page.url.pathname, '/path');
    assert.equal(result.page.document.title, 'Example title');
    assert.equal(result.page.document.language, 'en');
    assert.deepEqual(result.page.viewport, { width: 1280, height: 720, devicePixelRatio: 2 });
    assert.equal(result.page.navigation?.duration, 42);
    assert.equal(result.diagnostics.some(diagnostic => diagnostic.code === 'NO_PARSER_MATCHED'), false);
    assert.equal(result.page.meta[0]?.name, 'description');
    assert.equal(result.page.meta[1]?.property, 'og:title');
    assert.equal(result.page.links[0]?.rel, 'canonical');
});

test('Cookie Store records are mapped into plain stable records', async () => {
    const cookie: CookieLike = { name: 'sid', value: 'secret', domain: 'example.test', path: '/', expires: 123, secure: true, sameSite: 'lax', partitioned: false };
    const result = await captureCurrentTab({ page: page({ cookieStore: { getAll: async () => [cookie] } }) });

    assert.deepEqual(result.page.cookies, [cookie]);
    assert.equal(result.diagnostics.length, 0);
});

test('Cookie Store failure uses fallback and preserves generic metadata', async () => {
    const document = new FakeDocument('sid=secret; theme=dark');
    const result = await captureCurrentTab({ page: page({ document, cookieStore: { getAll: async () => { throw new Error('denied'); } } }) });

    assert.equal(result.status, 'partial');
    assert.equal(result.page.document.title, 'Example title');
    assert.deepEqual(result.page.cookies.map(cookie => cookie.name), ['sid', 'theme']);
    assert.ok(result.diagnostics.some(diagnostic => diagnostic.code === 'COOKIE_CAPTURE_FAILED'));
    assert.ok(result.diagnostics.some(diagnostic => diagnostic.code === 'COOKIE_CAPTURE_FALLBACK'));
});

test('an asynchronous specialized parser is run after generic capture', async () => {
    registerParser({
        id: 'async-test-parser',
        matches: candidate => candidate.host === 'async.example.test',
        parse: async () => ({ data: { enriched: true }, summary: [{ label: 'Enriched', value: 'yes' }] }),
    });
    const result = await captureCurrentTab({ page: page({ host: 'async.example.test' }) });

    assert.equal(result.status, 'complete');
    assert.equal(result.specialized?.parserId, 'async-test-parser');
    assert.deepEqual(result.specialized?.data, { enriched: true });
    assert.equal(result.page.document.title, 'Example title');
});

test('specialized parser failure retains generic data', async () => {
    registerParser({
        id: 'failure-test-parser',
        matches: candidate => candidate.host === 'failure.example.test',
        parse: () => { throw new Error('broken parser'); },
    });
    const result = await captureCurrentTab({ page: page({ host: 'failure.example.test' }) });

    assert.equal(result.status, 'partial');
    assert.equal(result.specialized?.status, 'failed');
    assert.equal(result.page.document.title, 'Example title');
    assert.ok(result.diagnostics.some(diagnostic => diagnostic.code === 'SPECIALIZED_PARSER_FAILED'));
});
