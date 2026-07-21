import type { CaptureEnvelope, CaptureOptions, Diagnostic, ParserPageContext, SummaryRow } from './contracts.ts';
import { selectParser } from './registry.ts';
import { adoptOrCreateReportSurface, renderCaptureReport } from './report.ts';

function browserPage(): ParserPageContext {
    return { url: globalThis.location.href, host: globalThis.location.host, document: globalThis.document };
}

function envelope(status: CaptureEnvelope['status'], page: ParserPageContext, capturedAt: string, diagnostics: readonly Diagnostic[], parserId?: string, data?: unknown, summary: readonly SummaryRow[] = []): CaptureEnvelope {
    return { status, page: { url: page.url, host: page.host }, capturedAt, ...(parserId === undefined ? {} : { parserId }), ...(data === undefined ? {} : { data }), summary: [...summary], diagnostics: [...diagnostics] };
}

export function captureCurrentTab(options: CaptureOptions = {}): CaptureEnvelope {
    const page = options.page ?? browserPage();
    const capturedAt = (options.clock ?? (() => new Date().toISOString()))();
    const parser = selectParser(page);
    if (parser === undefined) return report(envelope('unsupported', page, capturedAt, [{ code: 'NO_PARSER_MATCHED', message: 'No parser supports this page.', severity: 'warning' }]), options.reportWindow);
    try {
        const output = parser.parse(page);
        const diagnostics = output.diagnostics ?? [];
        const status = diagnostics.some(diagnostic => diagnostic.code === 'ASANA_NO_OPEN_TASK') ? 'unsupported' : diagnostics.length > 0 ? 'partial' : 'complete';
        return report(envelope(status, page, capturedAt, diagnostics, parser.id, output.data, output.summary), options.reportWindow);
    } catch {
        return report(envelope('failed', page, capturedAt, [{ code: 'PARSER_FAILED', message: `Parser ${parser.id} failed while capturing this page.`, severity: 'error' }], parser.id), options.reportWindow);
    }
}

function report(value: CaptureEnvelope, reportWindow: Window | null | undefined): CaptureEnvelope {
    if (reportWindow?.document !== undefined) renderCaptureReport(adoptOrCreateReportSurface(reportWindow.document as never), value);
    return value;
}
