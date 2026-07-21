export type CaptureStatus = 'complete' | 'partial' | 'unsupported' | 'failed';
export type DiagnosticSeverity = 'warning' | 'error';

export interface Diagnostic {
    readonly code: string;
    readonly message: string;
    readonly severity: DiagnosticSeverity;
}

export interface SummaryRow {
    readonly label: string;
    readonly value: string;
}

export interface CapturePage {
    readonly url: string;
    readonly host: string;
}

export interface ParserElement {
    readonly textContent?: string | null;
    readonly value?: string | null;
    querySelector(selector: string): ParserElement | null;
}

export interface ParserDocument {
    querySelector(selector: string): ParserElement | null;
}

export interface ParserPageContext extends CapturePage {
    readonly document: ParserDocument;
}

export interface ParserOutput<TData> {
    readonly data: TData;
    readonly summary: readonly SummaryRow[];
    readonly diagnostics?: readonly Diagnostic[];
}

export interface Parser<TData> {
    readonly id: string;
    matches(page: ParserPageContext): boolean;
    parse(page: ParserPageContext): ParserOutput<TData>;
}

export interface CaptureEnvelope<TData = unknown> {
    readonly status: CaptureStatus;
    readonly page: CapturePage;
    readonly capturedAt: string;
    readonly parserId?: string;
    readonly data?: TData;
    readonly summary: readonly SummaryRow[];
    readonly diagnostics: readonly Diagnostic[];
}

export interface CaptureOptions {
    readonly page?: ParserPageContext;
    readonly reportWindow?: Window | null;
    readonly clock?: () => string;
}

export interface AsanaTaskPreview {
    readonly taskId: string | null;
    readonly taskTitle: string | null;
}
