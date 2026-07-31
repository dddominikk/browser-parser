import type { CaptureResult, Diagnostic, SpecializedCapture } from './contracts.ts';

type ReportNode = {
    id: string;
    className: string;
    textContent: string | null;
    children?: ReportNode[];
    append(...nodes: ReportNode[]): void;
    appendChild(node: ReportNode): ReportNode;
    replaceChildren(...nodes: ReportNode[]): void;
    setAttribute(name: string, value: string): void;
};

type ReportDocument = {
    title: string;
    body: ReportNode;
    createElement(tagName: string): ReportNode;
    getElementById(id: string): ReportNode | null;
};

export interface ReportSurface {
    readonly document: ReportDocument;
    readonly outcomeBlock: ReportNode;
    readonly captureStatus: ReportNode;
    readonly captureMessage: ReportNode;
    readonly reportSections: ReportNode;
}

const messages = {
    complete: 'The current browser page was captured successfully.',
    partial: 'Usable page data was captured, but some diagnostics require review.',
    failed: 'Browser Parser could not produce or render a usable capture. Review Diagnostics.',
    importFailed: 'The Browser Parser module did not load. Review the source page console entry prefixed browser-parser:import-failed. Browser Parser does not bypass site policy or retry another host.',
} as const;

function element(document: ReportDocument, tag: string, text?: string): ReportNode {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
}

function named(document: ReportDocument, tag: string, id: string, text?: string): ReportNode {
    const node = element(document, tag, text);
    node.id = id;
    return node;
}

function statusLabel(status: CaptureResult['status']): string {
    return `${status[0]?.toUpperCase()}${status.slice(1)}`;
}

export function adoptOrCreateReportSurface(document: ReportDocument): ReportSurface {
    const existing = ['outcome-block', 'capture-status', 'capture-message', 'report-sections'].map(id => document.getElementById(id));
    if (existing.every(Boolean)) return { document, outcomeBlock: existing[0]!, captureStatus: existing[1]!, captureMessage: existing[2]!, reportSections: existing[3]! };
    document.title = 'Browser Parser — Capture report';
    const main = element(document, 'main');
    main.setAttribute('aria-labelledby', 'report-title');
    const outcomeBlock = named(document, 'header', 'outcome-block');
    outcomeBlock.className = 'status-loading';
    outcomeBlock.append(element(document, 'p', 'Browser Parser'), named(document, 'h1', 'report-title', 'Capture report'));
    const captureStatus = named(document, 'p', 'capture-status');
    captureStatus.setAttribute('role', 'status');
    captureStatus.setAttribute('aria-live', 'polite');
    captureStatus.setAttribute('aria-atomic', 'true');
    const captureMessage = named(document, 'p', 'capture-message', 'Loading Browser Parser and capturing this tab. Keep this report tab open.');
    const reportSections = named(document, 'div', 'report-sections');
    outcomeBlock.append(captureStatus, captureMessage);
    main.append(outcomeBlock, reportSections);
    document.body.replaceChildren(main);
    captureStatus.textContent = 'Capture status: Loading.';
    return { document, outcomeBlock, captureStatus, captureMessage, reportSections };
}

function section(document: ReportDocument, heading: string, id: string): ReportNode {
    const value = element(document, 'section');
    const h2 = named(document, 'h2', id, heading);
    value.setAttribute('aria-labelledby', id);
    value.appendChild(h2);
    return value;
}

function row(document: ReportDocument, label: string, value: string): ReportNode {
    const group = element(document, 'div');
    group.append(element(document, 'dt', label), element(document, 'dd', value));
    return group;
}

function jsonText(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2) ?? '';
    } catch {
        return '[unserializable value]';
    }
}

function objectSection(document: ReportDocument, heading: string, id: string, value: unknown): ReportNode {
    const result = section(document, heading, id);
    const pre = element(document, 'pre');
    pre.appendChild(element(document, 'code', jsonText(value)));
    result.appendChild(pre);
    return result;
}

function specializedLabel(specialized: SpecializedCapture | null): string {
    if (specialized === null) return 'No specialized parser matched';
    if (specialized.status === 'failed') return `Specialized parser ${specialized.parserId} failed`;
    if (specialized.status === 'partial') return `Specialized parser ${specialized.parserId} returned partial data`;
    return `Specialized parser ${specialized.parserId} succeeded`;
}

export function renderCaptureReport(surface: ReportSurface, result: CaptureResult): void {
    const { document } = surface;
    const label = statusLabel(result.status);
    surface.outcomeBlock.className = `status-${result.status}`;
    surface.captureMessage.textContent = messages[result.status];

    const summary = section(document, 'Capture outcome', 'summary-heading');
    const summaryList = element(document, 'dl');
    summaryList.append(
        row(document, 'Outcome', label),
        row(document, 'Captured at', result.capturedAt),
        row(document, 'Specialized parser', specializedLabel(result.specialized)),
    );
    summary.appendChild(summaryList);

    const identity = objectSection(document, 'Page identity and URL components', 'identity-heading', result.page.url);
    const documentData = objectSection(document, 'Document metadata', 'document-heading', result.page.document);
    const metadata = objectSection(document, 'Meta records', 'meta-heading', result.page.meta);
    const links = objectSection(document, 'Metadata-bearing links', 'links-heading', result.page.links);
    const environment = objectSection(document, 'Viewport and screen data', 'environment-heading', { viewport: result.page.viewport, screen: result.page.screen });
    const navigation = objectSection(document, 'Navigation timing', 'navigation-heading', result.page.navigation);

    const cookies = section(document, 'Cookies', 'cookies-heading');
    cookies.appendChild(element(document, 'p', 'Warning: cookies are sensitive script-visible data. Review and share this section carefully.'));
    const cookieDetails = element(document, 'details');
    cookieDetails.append(element(document, 'summary', `Show ${result.page.cookies.length} captured cookie record(s)`));
    cookieDetails.appendChild(element(document, 'pre', jsonText(result.page.cookies)));
    cookies.appendChild(cookieDetails);

    const sections = [summary, identity, documentData, metadata, links, environment, navigation, cookies];
    if (result.specialized !== null) sections.push(objectSection(document, 'Specialized parser result', 'specialized-heading', result.specialized));
    if (result.diagnostics.length > 0) {
        const diagnostics = section(document, `Diagnostics (${result.diagnostics.length})`, 'diagnostics-heading');
        const ordered = element(document, 'ol');
        for (const diagnostic of result.diagnostics) {
            const item = element(document, 'li');
            item.append(
                element(document, 'span', `${diagnostic.severity === 'error' ? 'Error' : 'Warning'} `),
                element(document, 'code', diagnostic.code),
                element(document, 'span', ` ${diagnostic.message}`),
            );
            ordered.appendChild(item);
        }
        diagnostics.appendChild(ordered);
        sections.push(diagnostics);
    }
    sections.push(objectSection(document, 'Result JSON', 'json-heading', result));
    surface.reportSections.replaceChildren(...sections);
    surface.captureStatus.textContent = `Capture status: ${label}.`;
}

export function renderImportFailure(surface: ReportSurface): void {
    surface.outcomeBlock.className = 'status-import-failed';
    surface.captureMessage.textContent = messages.importFailed;
    surface.reportSections.replaceChildren();
    surface.captureStatus.textContent = 'Capture status: Import failed.';
}
