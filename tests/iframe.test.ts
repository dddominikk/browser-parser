import assert from 'node:assert/strict';
import test from 'node:test';
import { captureIframeMetadata, normalizeIframeAddress, renderIframeExplorer } from '../src/iframe.ts';

class FakeNode {
    readonly tagName: string;
    id = '';
    className = '';
    textContent: string | null = null;
    type = '';
    value = '';
    src = '';
    title = '';
    inputMode = '';
    autocomplete = '';
    placeholder = '';
    required = false;
    referrerPolicy = '';
    contentDocument: FakeDocument | null = null;
    parent: FakeNode | null = null;
    readonly children: FakeNode[] = [];
    readonly attributes = new Map<string, string>();
    readonly listeners = new Map<string, ((event: { preventDefault(): void }) => void)[]>();

    constructor(tagName: string) { this.tagName = tagName; }
    append(...nodes: FakeNode[]): void { for (const node of nodes) { node.parent = this; this.children.push(node); } }
    appendChild(node: FakeNode): FakeNode { node.parent = this; this.children.push(node); return node; }
    replaceWith(node: FakeNode): void {
        if (this.parent === null) return;
        const index = this.parent.children.indexOf(this);
        if (index >= 0) {
            node.parent = this.parent;
            this.parent.children.splice(index, 1, node);
        }
    }
    setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
    addEventListener(type: string, listener: (event: { preventDefault(): void }) => void): void {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }
    dispatch(type: string): void {
        for (const listener of this.listeners.get(type) ?? []) listener({ preventDefault() {} });
    }
}

class FakeDocument {
    title = 'Embedded title';
    readonly elements = new Map<string, FakeNode>();
    createElement(tagName: string): FakeNode {
        const node = new FakeNode(tagName);
        this.elements.set(tagName, node);
        return node;
    }
    querySelector(selector: string): FakeNode | null {
        if (selector.includes('description')) return { getAttribute: (name: string) => name === 'content' ? 'A description' : null } as unknown as FakeNode;
        if (selector.includes('canonical')) return { getAttribute: (name: string) => name === 'href' ? '/canonical' : null } as unknown as FakeNode;
        return null;
    }
    querySelectorAll(selector: string): FakeNode[] {
        if (selector.includes('og:')) return [
            { getAttribute: (name: string) => name === 'property' ? 'og:title' : name === 'content' ? 'OG title' : null } as unknown as FakeNode,
        ];
        return [];
    }
}

function flatten(node: FakeNode): string {
    return [node.textContent ?? '', ...node.children.map(flatten)].join(' ');
}

test('normalizes missing schemes and preserves HTTP(S)', () => {
    assert.equal(normalizeIframeAddress('example.com/path'), 'https://example.com/path');
    assert.equal(normalizeIframeAddress('http://example.com'), 'http://example.com/');
    assert.equal(normalizeIframeAddress('//example.com'), 'https://example.com/');
});

test('rejects blank, malformed, and non-web addresses', () => {
    assert.throws(() => normalizeIframeAddress(''), /Enter an address/u);
    assert.throws(() => normalizeIframeAddress('javascript:alert(1)'), /Only HTTP\(S\)/u);
    assert.throws(() => normalizeIframeAddress('not a valid address'), /valid web address/u);
});

test('captures basic same-origin iframe metadata and resolves canonical links', () => {
    const frame = { src: 'https://example.com/page', contentDocument: new FakeDocument() } as unknown as HTMLIFrameElement;
    const metadata = captureIframeMetadata(frame);
    assert.deepEqual(metadata, {
        url: 'https://example.com/page',
        title: 'Embedded title',
        description: 'A description',
        canonical: 'https://example.com/canonical',
        openGraph: [{ property: 'og:title', content: 'OG title' }],
    });
});

test('reports inaccessible iframe documents and keeps explorer interaction inline', () => {
    const reportDocument = new FakeDocument();
    const details = renderIframeExplorer(reportDocument as unknown as Document) as unknown as FakeNode;
    const form = reportDocument.elements.get('form')!;
    const input = reportDocument.elements.get('input')!;
    const frame = reportDocument.elements.get('iframe')!;
    input.value = 'example.com';
    form.dispatch('submit');
    assert.equal(input.value, 'https://example.com/');
    frame.contentDocument = null;
    frame.dispatch('load');
    assert.match(flatten(details), /cross-origin browser restriction/u);
});

test('renders hostile metadata as text rather than markup', () => {
    const document = new FakeDocument();
    document.title = '<img src=x onerror=alert(1)>';
    const frame = { src: 'https://example.com', contentDocument: document } as unknown as HTMLIFrameElement;
    const metadata = captureIframeMetadata(frame);
    assert.equal(metadata.title, '<img src=x onerror=alert(1)>');
});
