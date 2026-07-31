export type CaptureStatus = 'complete' | 'partial' | 'failed';
export type SpecializedStatus = 'complete' | 'partial' | 'failed';
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
    readonly tagName?: string;
    readonly href?: string;
    getAttribute?(name: string): string | null;
    querySelector(selector: string): ParserElement | null;
    querySelectorAll?(selector: string): readonly ParserElement[];
}

export interface ParserDocument {
    readonly title?: string;
    readonly referrer?: string;
    readonly documentElement?: ParserElement | null;
    readonly characterSet?: string;
    readonly contentType?: string;
    readonly readyState?: string;
    readonly lastModified?: string;
    readonly cookie?: string;
    querySelector(selector: string): ParserElement | null;
    querySelectorAll?(selector: string): readonly ParserElement[];
}

export interface CookieLike {
    readonly name: string;
    readonly value: string;
    readonly domain?: string | null;
    readonly path?: string | null;
    readonly expires?: number | null;
    readonly secure?: boolean | null;
    readonly sameSite?: string | null;
    readonly partitioned?: boolean | null;
}

export interface CookieStoreLike {
    getAll(): Promise<readonly CookieLike[]>;
}

export interface ScreenLike {
    readonly width?: number;
    readonly height?: number;
    readonly availWidth?: number;
    readonly availHeight?: number;
    readonly colorDepth?: number;
    readonly pixelDepth?: number;
}

export interface PerformanceEntryLike {
    readonly name?: string;
    readonly entryType?: string;
    readonly startTime?: number;
    readonly duration?: number;
    readonly initiatorType?: string;
    readonly nextHopProtocol?: string;
    readonly workerStart?: number;
    readonly redirectStart?: number;
    readonly redirectEnd?: number;
    readonly fetchStart?: number;
    readonly domainLookupStart?: number;
    readonly domainLookupEnd?: number;
    readonly connectStart?: number;
    readonly connectEnd?: number;
    readonly secureConnectionStart?: number;
    readonly requestStart?: number;
    readonly responseStart?: number;
    readonly responseEnd?: number;
    readonly transferSize?: number;
    readonly encodedBodySize?: number;
    readonly decodedBodySize?: number;
}

export interface PerformanceLike {
    getEntriesByType(type: string): readonly PerformanceEntryLike[];
}

export interface PageLocationLike {
    readonly href: string;
    readonly origin?: string;
    readonly protocol?: string;
    readonly host?: string;
    readonly hostname?: string;
    readonly port?: string;
    readonly pathname?: string;
    readonly search?: string;
    readonly hash?: string;
}

export interface ParserPageContext extends CapturePage {
    readonly document: ParserDocument;
    readonly location?: PageLocationLike;
    readonly viewport?: {
        readonly width?: number;
        readonly height?: number;
    };
    readonly screen?: ScreenLike | null;
    readonly devicePixelRatio?: number;
    readonly performance?: PerformanceLike | null;
    readonly cookieStore?: CookieStoreLike | null;
}

export interface MetaRecord {
    readonly name?: string;
    readonly property?: string;
    readonly httpEquiv?: string;
    readonly charset?: string;
    readonly content?: string;
}

export interface MetadataLink {
    readonly rel: string;
    readonly href: string;
    readonly type?: string;
    readonly hreflang?: string;
    readonly media?: string;
    readonly title?: string;
}

export interface UrlData {
    readonly href: string;
    readonly origin: string;
    readonly protocol: string;
    readonly host: string;
    readonly hostname: string;
    readonly port: string;
    readonly pathname: string;
    readonly search: string;
    readonly hash: string;
}

export interface DocumentData {
    readonly title: string;
    readonly referrer: string;
    readonly language: string;
    readonly characterSet: string;
    readonly contentType: string;
    readonly readyState: string;
    readonly lastModified: string;
}

export interface ViewportData {
    readonly width: number | null;
    readonly height: number | null;
    readonly devicePixelRatio: number | null;
}

export interface ScreenData {
    readonly width: number | null;
    readonly height: number | null;
    readonly availableWidth: number | null;
    readonly availableHeight: number | null;
    readonly colorDepth: number | null;
    readonly pixelDepth: number | null;
}

export type NavigationTimingData = Readonly<Record<string, string | number | null>>;

export interface GenericPageData {
    readonly url: UrlData;
    readonly document: DocumentData;
    readonly meta: readonly MetaRecord[];
    readonly links: readonly MetadataLink[];
    readonly viewport: ViewportData;
    readonly screen: ScreenData;
    readonly navigation: NavigationTimingData | null;
    readonly cookies: readonly CookieLike[];
}

export interface ParserOutput<TData> {
    readonly data: TData;
    readonly summary: readonly SummaryRow[];
    readonly diagnostics?: readonly Diagnostic[];
}

export interface Parser<TData> {
    readonly id: string;
    matches(page: ParserPageContext): boolean;
    parse(page: ParserPageContext): ParserOutput<TData> | Promise<ParserOutput<TData>>;
}

export interface SpecializedCapture<TData = unknown> {
    readonly parserId: string;
    readonly status: SpecializedStatus;
    readonly data?: TData;
    readonly summary: readonly SummaryRow[];
    readonly diagnostics: readonly Diagnostic[];
}

export interface CaptureResult {
    readonly status: CaptureStatus;
    readonly page: GenericPageData;
    readonly capturedAt: string;
    readonly specialized: SpecializedCapture | null;
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

/** @deprecated Use CaptureResult. Kept as a source-compatibility alias. */
export type CaptureEnvelope<TData = unknown> = CaptureResult & {
    readonly data?: TData;
    readonly parserId?: string;
    readonly summary?: readonly SummaryRow[];
};
