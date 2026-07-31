import type { CaptureOptions, CaptureResult, Diagnostic, ParserPageContext, SpecializedCapture } from './contracts.ts';
import { captureGenericPage } from './generic.ts';
import { selectParser } from './registry.ts';
import { adoptOrCreateReportSurface, renderCaptureReport } from './report.ts';

function browserPage(): ParserPageContext {
    const location = globalThis.location;
    const document = globalThis.document as unknown as ParserPageContext['document'];
    const globals = globalThis as typeof globalThis & { cookieStore?: ParserPageContext['cookieStore'] };
    return {
        url: location.href,
        host: location.host,
        document,
        location,
        viewport: { width: globalThis.innerWidth, height: globalThis.innerHeight },
        screen: globalThis.screen,
        devicePixelRatio: globalThis.devicePixelRatio,
        performance: globalThis.performance,
        cookieStore: globals.cookieStore,
    };
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function deriveStatus(diagnostics: readonly Diagnostic[], genericAvailable: boolean): CaptureResult['status'] {
    if (!genericAvailable) return 'failed';
    return diagnostics.length > 0 ? 'partial' : 'complete';
}

function specializedStatus(diagnostics: readonly Diagnostic[]): SpecializedCapture['status'] {
    return diagnostics.some(diagnostic => diagnostic.severity === 'error') ? 'failed' : diagnostics.length > 0 ? 'partial' : 'complete';
}

function resultIsSerializable(result: CaptureResult): boolean {
    try {
        JSON.stringify(result);
        return true;
    } catch {
        return false;
    }
}

export async function captureCurrentTab(options: CaptureOptions = {}): Promise<CaptureResult> {
    const page = options.page ?? browserPage();
    const capturedAt = (options.clock ?? (() => new Date().toISOString()))();
    const generic = await captureGenericPage(page);
    const diagnostics: Diagnostic[] = [...generic.diagnostics];
    let specialized: SpecializedCapture | null = null;
    const parser = selectParser(page);

    if (parser !== undefined) {
        try {
            const output = await parser.parse(page);
            const parserDiagnostics = [...(output.diagnostics ?? [])];
            specialized = {
                parserId: parser.id,
                status: specializedStatus(parserDiagnostics),
                data: output.data,
                summary: [...output.summary],
                diagnostics: parserDiagnostics,
            };
            diagnostics.push(...parserDiagnostics);
        } catch (error) {
            const failure: Diagnostic = {
                code: 'SPECIALIZED_PARSER_FAILED',
                message: `Parser ${parser.id} failed while capturing this page: ${errorMessage(error)}`,
                severity: 'error',
            };
            specialized = {
                parserId: parser.id,
                status: 'failed',
                summary: [],
                diagnostics: [failure],
            };
            diagnostics.push(failure);
        }
    }

    let result: CaptureResult = {
        capturedAt,
        status: deriveStatus(diagnostics, generic.data !== null),
        page: generic.data,
        specialized,
        diagnostics,
    };

    if (!resultIsSerializable(result)) {
        const serializationDiagnostic: Diagnostic = {
            code: 'SERIALIZATION_FAILED',
            message: 'The capture contained a value that could not be serialized as JSON.',
            severity: 'error',
        };
        result = {
            ...result,
            status: 'partial',
            diagnostics: [...result.diagnostics, serializationDiagnostic],
        };
    }

    if (options.reportWindow?.document !== undefined) {
        try {
            renderCaptureReport(adoptOrCreateReportSurface(options.reportWindow.document as never), result);
        } catch (error) {
            result = {
                ...result,
                status: 'failed',
                diagnostics: [...result.diagnostics, {
                    code: 'REPORT_RENDER_FAILED',
                    message: `The capture was produced but the report could not be rendered: ${errorMessage(error)}`,
                    severity: 'error',
                }],
            };
        }
    }

    return result;
}
