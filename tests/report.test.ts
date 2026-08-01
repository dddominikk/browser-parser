import assert from 'node:assert/strict';
import test from 'node:test';
import { adoptOrCreateReportSurface, renderCaptureReport } from '../src/report.ts';
import type { CaptureResult } from '../src/contracts.ts';

class Node {
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
    readonly children: Node[] = [];
    readonly attributes = new Map<string, string>();
    readonly listeners = new Map<string, ((event: { preventDefault(): void }) => void)[]>();

    constructor(tagName = 'node') { this.tagName = tagName; }

    append(...nodes: Node[]): void { this.children.push(...nodes); }
    appendChild(node: Node): Node { this.children.push(node); return node; }
    replaceChildren(...nodes: Node[]): void { this.children.splice(0, this.children.length, ...nodes); }
    setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
    addEventListener(type: string, listener: (event: { preventDefault(): void }) => void): void {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }
}

class Document {
    title = '';
    readonly body = new Node();
    createElement(tagName: string): Node { return new Node(tagName); }
    getElementById(id: string): Node | null {
        const visit = (node: Node): Node | null => {
            if (node.id === id) return node;
            for (const child of node.children) {
                const match = visit(child);
                if (match) return match;
            }
            return null;
        };
        return visit(this.body);
    }
}

function flatten(node: Node): string {
    return [node.textContent ?? '', ...node.children.map(flatten)].join(' ');
}

const result: CaptureResult = {
    capturedAt: '2026-07-31T00:00:00.000Z',
    status: 'partial',
    page: {
        url: { href: 'https://example.test/<img>', origin: 'https://example.test', protocol: 'https:', host: 'example.test', hostname: 'example.test', port: '', pathname: '/', search: '', hash: '' },
        document: { title: '<script>alert(1)</script>', referrer: '', language: 'en', characterSet: 'UTF-8', contentType: 'text/html', readyState: 'complete', lastModified: '' },
        meta: [{ name: '<img src=x onerror=alert(1)>', content: 'unsafe' }],
        links: [],
        viewport: { width: 1, height: 2, devicePixelRatio: 1 },
        screen: { width: 1, height: 2, availableWidth: 1, availableHeight: 2, colorDepth: 24, pixelDepth: 24 },
        navigation: null,
        cookies: [{ name: '<script>', value: 'cookie-value' }],
    },
    specialized: { parserId: 'test', status: 'partial', data: { text: '<b>unsafe</b>' }, summary: [], diagnostics: [{ code: 'TEST_WARNING', message: 'warning', severity: 'warning' }] },
    diagnostics: [{ code: 'COOKIE_CAPTURE_FALLBACK', message: 'fallback', severity: 'warning' }],
};

test('report renders generic, specialized, diagnostics, and JSON content as text', () => {
    const document = new Document();
    const surface = adoptOrCreateReportSurface(document as never);
    renderCaptureReport(surface, result);
    const rendered = flatten(surface.reportSections as unknown as Node);

    assert.match(rendered, /Page identity and URL components/);
    assert.match(rendered, /Cookies/);
    assert.match(rendered, /cookies are sensitive/i);
    assert.match(rendered, /Specialized parser result/);
    assert.match(rendered, /<script>alert\(1\)<\/script>/);
    assert.match(rendered, /<img src=x onerror=alert\(1\)>/);
    assert.equal(document.body.children.some(node => flatten(node).includes('script') && node.attributes.has('onerror')), false);
});
