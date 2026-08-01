import type { MetaRecord } from './contracts.ts';

export interface IframeOpenGraphRecord {
    readonly property: string;
    readonly content: string;
}

export interface IframeMetadata {
    readonly url: string;
    readonly title: string;
    readonly description: string;
    readonly canonical: string;
    readonly openGraph: readonly IframeOpenGraphRecord[];
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function normalizeIframeAddress(rawAddress: string): string {
    const trimmed = rawAddress.trim();
    if (!trimmed) throw new Error('Enter an address to load.');

    const candidate = trimmed.startsWith('//')
        ? `https:${trimmed}`
        : /^[a-z][a-z\d+.-]*:/iu.test(trimmed)
            ? trimmed
            : `https://${trimmed}`;
    let parsed: URL;
    try {
        parsed = new URL(candidate);
    } catch {
        throw new Error('Enter a valid web address.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only HTTP(S) addresses can be loaded in the explorer.');
    }
    if (!parsed.hostname) throw new Error('Enter a web address with a hostname.');
    return parsed.href;
}

function metaContent(document: Document, selector: string): string {
    return document.querySelector(selector)?.getAttribute('content')?.trim() ?? '';
}

function resolvedLink(document: Document, selector: string, baseUrl: string): string {
    const href = document.querySelector(selector)?.getAttribute('href')?.trim() ?? '';
    if (!href) return '';
    try {
        return new URL(href, baseUrl).href;
    } catch {
        return href;
    }
}

export function captureIframeMetadata(frame: HTMLIFrameElement): IframeMetadata {
    let document: Document | null;
    try {
        document = frame.contentDocument;
    } catch (error) {
        throw new Error(`The loaded page document could not be inspected: ${errorMessage(error)}`);
    }
    if (document === null) {
        throw new Error('The page loaded, but its document is not accessible from the report tab. This is usually a cross-origin browser restriction.');
    }

    let url = frame.src;
    try {
        const frameUrl = frame.contentWindow?.location.href;
        if (frameUrl) url = frameUrl;
    } catch {
        // The iframe source is still a safe, useful URL when location access is cross-origin restricted.
    }

    const openGraph: IframeOpenGraphRecord[] = [];
    for (const element of Array.from(document.querySelectorAll('meta[property^="og:"]'))) {
        const property = element.getAttribute('property')?.trim() ?? '';
        const content = element.getAttribute('content')?.trim() ?? '';
        if (property && content) openGraph.push({ property, content });
    }

    return {
        url,
        title: document.title.trim(),
        description: metaContent(document, 'meta[name="description"]'),
        canonical: resolvedLink(document, 'link[rel~="canonical" i]', url),
        openGraph,
    };
}

const explorerStyles = `
.iframe-explorer { margin-top: 1.25rem; border: 1px solid #cbd5e1; border-radius: .75rem; background: #f8fafc; overflow: hidden; }
.iframe-explorer > summary { cursor: pointer; padding: .75rem 1rem; font-weight: 700; color: #0f172a; }
.iframe-explorer > summary::marker { color: #64748b; }
.iframe-window { margin: 0 1rem 1rem; border: 1px solid #94a3b8; border-radius: .6rem; background: #fff; box-shadow: 0 .35rem 1rem #0f172a1a; overflow: hidden; }
.iframe-toolbar { display: flex; gap: .45rem; align-items: center; padding: .5rem; background: #e2e8f0; border-bottom: 1px solid #cbd5e1; }
.iframe-url-input { min-width: 0; flex: 1; padding: .35rem .55rem; border: 1px solid #94a3b8; border-radius: .35rem; font: inherit; color: #0f172a; background: #fff; }
.iframe-go-button { padding: .35rem .7rem; border: 1px solid #475569; border-radius: .35rem; color: #fff; background: #334155; font: inherit; cursor: pointer; }
.iframe-go-button:hover { background: #1e293b; }
.iframe-viewport { min-height: 12rem; background: #e2e8f0; }
.iframe-page { display: block; width: 100%; min-height: 20rem; border: 0; background: #fff; }
.iframe-result { padding: .75rem 1rem; border-top: 1px solid #cbd5e1; color: #334155; }
.iframe-result-error { color: #991b1b; background: #fef2f2; }
.iframe-result-heading { margin: 0 0 .55rem; font-size: 1rem; color: #0f172a; }
.iframe-result dl { display: grid; grid-template-columns: minmax(6rem, 10rem) 1fr; gap: .35rem .75rem; margin: 0; }
.iframe-result dt { font-weight: 700; color: #475569; }
.iframe-result dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.iframe-open-graph { margin: .7rem 0 0; }
`;

function resultMessage(document: Document, message: string, error = false): HTMLDivElement {
    const result = document.createElement('div');
    result.className = `iframe-result${error ? ' iframe-result-error' : ''}`;
    result.setAttribute('role', 'status');
    result.setAttribute('aria-live', 'polite');
    result.textContent = message;
    return result;
}

function metadataResult(document: Document, metadata: IframeMetadata): HTMLDivElement {
    const result = document.createElement('div');
    result.className = 'iframe-result';
    result.setAttribute('role', 'status');
    result.setAttribute('aria-live', 'polite');
    const heading = document.createElement('h3');
    heading.className = 'iframe-result-heading';
    heading.textContent = 'Loaded page metadata';
    const list = document.createElement('dl');
    const rows: readonly [string, string][] = [
        ['URL', metadata.url],
        ['Title', metadata.title || '(none)'],
        ['Description', metadata.description || '(none)'],
        ['Canonical', metadata.canonical || '(none)'],
    ];
    for (const [label, value] of rows) {
        const term = document.createElement('dt');
        term.textContent = label;
        const definition = document.createElement('dd');
        definition.textContent = value;
        list.append(term, definition);
    }
    result.append(heading, list);
    if (metadata.openGraph.length > 0) {
        const openGraph = document.createElement('p');
        openGraph.className = 'iframe-open-graph';
        openGraph.textContent = `Open Graph: ${metadata.openGraph.map(record => `${record.property}=${record.content}`).join(' · ')}`;
        result.appendChild(openGraph);
    }
    return result;
}

export function renderIframeExplorer(document: Document): HTMLDetailsElement {
    const details = document.createElement('details');
    details.className = 'iframe-explorer';
    const summary = document.createElement('summary');
    summary.textContent = 'Embedded page explorer';

    const style = document.createElement('style');
    style.textContent = explorerStyles;

    const browserWindow = document.createElement('div');
    browserWindow.className = 'iframe-window';
    const toolbar = document.createElement('div');
    toolbar.className = 'iframe-toolbar';
    const form = document.createElement('form');
    form.setAttribute('aria-label', 'Navigate embedded page');
    form.noValidate = true;
    const input = document.createElement('input');
    input.className = 'iframe-url-input';
    input.type = 'url';
    input.inputMode = 'url';
    input.setAttribute('autocomplete', 'url');
    input.placeholder = 'example.com or https://example.com';
    input.required = true;
    input.setAttribute('aria-label', 'Address');
    const button = document.createElement('button');
    button.className = 'iframe-go-button';
    button.type = 'submit';
    button.textContent = 'Go';
    form.append(input, button);
    toolbar.appendChild(form);

    const viewport = document.createElement('div');
    viewport.className = 'iframe-viewport';
    const frame = document.createElement('iframe');
    frame.className = 'iframe-page';
    frame.title = 'Embedded page preview';
    frame.referrerPolicy = 'no-referrer';
    viewport.appendChild(frame);

    let result = resultMessage(document, 'Enter an address above to load a page.');
    let activeAddress: string | null = null;

    const replaceResult = (next: HTMLDivElement): void => {
        result.replaceWith(next);
        result = next;
    };

    form.addEventListener('submit', event => {
        event.preventDefault();
        try {
            const address = normalizeIframeAddress(input.value);
            activeAddress = address;
            input.value = address;
            replaceResult(resultMessage(document, `Loading ${address}…`));
            frame.src = address;
        } catch (error) {
            activeAddress = null;
            replaceResult(resultMessage(document, `Error: ${errorMessage(error)}`, true));
        }
    });

    frame.addEventListener('load', () => {
        if (activeAddress === null) return;
        try {
            replaceResult(metadataResult(document, captureIframeMetadata(frame)));
        } catch (error) {
            replaceResult(resultMessage(document, `Error: ${errorMessage(error)}`, true));
        }
    });
    frame.addEventListener('error', () => {
        if (activeAddress !== null) replaceResult(resultMessage(document, `Error: The page could not be loaded at ${activeAddress}.`, true));
    });

    browserWindow.append(toolbar, viewport, result);
    details.append(summary, style, browserWindow);
    return details;
}
