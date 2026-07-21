import type { CaptureEnvelope } from './contracts.ts';

type ReportNode = { id: string; className: string; textContent: string | null; children?: ReportNode[]; append(...nodes: ReportNode[]): void; appendChild(node: ReportNode): ReportNode; replaceChildren(...nodes: ReportNode[]): void; setAttribute(name: string, value: string): void };
type ReportDocument = { title: string; body: ReportNode; createElement(tagName: string): ReportNode; getElementById(id: string): ReportNode | null };

export interface ReportSurface {
    readonly document: ReportDocument;
    readonly outcomeBlock: ReportNode;
    readonly captureStatus: ReportNode;
    readonly captureMessage: ReportNode;
    readonly reportSections: ReportNode;
}

const messages = {
    complete: 'The supported page was captured successfully.',
    partial: 'Some usable data was captured, but the result is incomplete. Review Diagnostics before using it.',
    unsupported: 'No supported content was found in this tab. Open a supported page with the target content visible, then run the bookmarklet again.',
    failed: 'Browser Parser could not produce a usable capture. Review Diagnostics, correct the reported problem, and run the bookmarklet again.',
    importFailed: 'The Browser Parser module did not load. Review the source page console entry prefixed browser-parser:import-failed. Browser Parser does not bypass site policy or retry another host.',
} as const;

function element(document: ReportDocument, tag: string, text?: string): ReportNode { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
function named(document: ReportDocument, tag: string, id: string, text?: string): ReportNode { const node = element(document, tag, text); node.id = id; return node; }
function statusLabel(status: CaptureEnvelope['status']): string { return `${status[0]?.toUpperCase()}${status.slice(1)}`; }

export function adoptOrCreateReportSurface(document: ReportDocument): ReportSurface {
    const existing = ['outcome-block', 'capture-status', 'capture-message', 'report-sections'].map(id => document.getElementById(id));
    if (existing.every(Boolean)) return { document, outcomeBlock: existing[0]!, captureStatus: existing[1]!, captureMessage: existing[2]!, reportSections: existing[3]! };
    document.title = 'Browser Parser — Capture report';
    const main = element(document, 'main'); main.setAttribute('aria-labelledby', 'report-title');
    const outcomeBlock = named(document, 'header', 'outcome-block'); outcomeBlock.className = 'status-loading';
    outcomeBlock.append(element(document, 'p', 'Browser Parser'), named(document, 'h1', 'report-title', 'Capture report'));
    const captureStatus = named(document, 'p', 'capture-status'); captureStatus.setAttribute('role', 'status'); captureStatus.setAttribute('aria-live', 'polite'); captureStatus.setAttribute('aria-atomic', 'true');
    const captureMessage = named(document, 'p', 'capture-message', 'Loading Browser Parser and capturing this tab. Keep this report tab open.');
    const reportSections = named(document, 'div', 'report-sections');
    outcomeBlock.append(captureStatus, captureMessage); main.append(outcomeBlock, reportSections); document.body.appendChild(main);
    captureStatus.textContent = 'Capture status: Loading.';
    return { document, outcomeBlock, captureStatus, captureMessage, reportSections };
}

function section(document: ReportDocument, heading: string, id: string): ReportNode { const value = element(document, 'section'); const h2 = named(document, 'h2', id, heading); value.setAttribute('aria-labelledby', id); value.appendChild(h2); return value; }
function row(document: ReportDocument, label: string, value: string): ReportNode { const group = element(document, 'div'); group.append(element(document, 'dt', label), element(document, 'dd', value)); return group; }

export function renderCaptureReport(surface: ReportSurface, envelope: CaptureEnvelope): void {
    const { document } = surface; const label = statusLabel(envelope.status);
    surface.outcomeBlock.className = `status-${envelope.status}`;
    surface.captureMessage.textContent = messages[envelope.status];
    const summary = section(document, 'Capture summary', 'summary-heading'); const list = element(document, 'dl');
    list.append(row(document, 'Outcome', label), row(document, 'Parser', envelope.parserId ?? 'None'), row(document, 'Captured at', envelope.capturedAt), row(document, 'Page title', (envelope.data as { taskTitle?: string } | undefined)?.taskTitle ?? ''), row(document, 'Page URL', envelope.page.url));
    for (const item of envelope.summary) list.appendChild(row(document, item.label, item.value));
    summary.appendChild(list);
    const sections = [summary];
    if (envelope.diagnostics.length > 0) { const diagnostics = section(document, `Diagnostics (${envelope.diagnostics.length})`, 'diagnostics-heading'); const ordered = element(document, 'ol'); for (const diagnostic of envelope.diagnostics) { const item = element(document, 'li'); item.append(element(document, 'span', `${diagnostic.severity === 'error' ? 'Error' : 'Warning'} `), element(document, 'code', diagnostic.code), element(document, 'span', ` ${diagnostic.message}`)); ordered.appendChild(item); } diagnostics.appendChild(ordered); sections.push(diagnostics); }
    const json = section(document, 'Result JSON', 'json-heading'); json.append(element(document, 'p', 'Formatted capture envelope.')); const pre = element(document, 'pre'); pre.setAttribute('aria-labelledby', 'json-heading'); pre.appendChild(element(document, 'code', JSON.stringify(envelope, null, 2))); json.appendChild(pre); sections.push(json);
    surface.reportSections.replaceChildren(...sections);
    surface.captureStatus.textContent = `Capture status: ${label}.`;
}

export function renderImportFailure(surface: ReportSurface): void {
    surface.outcomeBlock.className = 'status-import-failed';
    surface.captureMessage.textContent = messages.importFailed;
    surface.reportSections.replaceChildren();
    surface.captureStatus.textContent = 'Capture status: Import failed.';
}
