import type {
    CookieLike,
    Diagnostic,
    GenericPageData,
    MetadataLink,
    MetaRecord,
    NavigationTimingData,
    PageLocationLike,
    ParserElement,
    ParserPageContext,
} from './contracts.ts';

export interface GenericCaptureResult {
    readonly data: GenericPageData;
    readonly diagnostics: readonly Diagnostic[];
}

function value(element: ParserElement | null | undefined, attribute: string): string | undefined {
    const result = element?.getAttribute?.(attribute);
    return result === null || result === undefined ? undefined : result;
}

function optionalNumber(input: number | undefined): number | null {
    return typeof input === 'number' && Number.isFinite(input) ? input : null;
}

function urlData(page: ParserPageContext): GenericPageData['url'] {
    const location = page.location;
    if (location !== undefined) {
        return {
            href: location.href,
            origin: location.origin ?? '',
            protocol: location.protocol ?? '',
            host: location.host ?? page.host,
            hostname: location.hostname ?? '',
            port: location.port ?? '',
            pathname: location.pathname ?? '',
            search: location.search ?? '',
            hash: location.hash ?? '',
        };
    }

    try {
        const parsed = new URL(page.url);
        return {
            href: parsed.href,
            origin: parsed.origin,
            protocol: parsed.protocol,
            host: parsed.host,
            hostname: parsed.hostname,
            port: parsed.port,
            pathname: parsed.pathname,
            search: parsed.search,
            hash: parsed.hash,
        };
    } catch {
        return {
            href: page.url,
            origin: '',
            protocol: '',
            host: page.host,
            hostname: '',
            port: '',
            pathname: '',
            search: '',
            hash: '',
        };
    }
}

function metaRecords(page: ParserPageContext): readonly MetaRecord[] {
    const elements = page.document.querySelectorAll?.('meta') ?? [];
    return Array.from(elements).map(element => {
        const record: Record<string, string> = {};
        const fields: readonly [string, string][] = [
            ['name', 'name'],
            ['property', 'property'],
            ['httpEquiv', 'http-equiv'],
            ['charset', 'charset'],
            ['content', 'content'],
        ];
        for (const [output, attribute] of fields) {
            const field = value(element, attribute);
            if (field !== undefined) record[output] = field;
        }
        return record as MetaRecord;
    });
}

function metadataLinks(page: ParserPageContext): readonly MetadataLink[] {
    const elements = page.document.querySelectorAll?.('link') ?? [];
    const links: MetadataLink[] = [];
    for (const element of Array.from(elements)) {
        const rel = value(element, 'rel') ?? '';
        const href = value(element, 'href') ?? element.href ?? '';
        if (!href || !/(^|\s)(canonical|alternate|manifest|icon)(?=\s|$)/i.test(rel)) continue;
        const link: Record<string, string> = { rel, href };
        for (const [output, attribute] of [['type', 'type'], ['hreflang', 'hreflang'], ['media', 'media'], ['title', 'title']] as const) {
            const field = value(element, attribute);
            if (field !== undefined) link[output] = field;
        }
        links.push(link as unknown as MetadataLink);
    }
    return links;
}

function mapNavigation(entry: import('./contracts.ts').PerformanceEntryLike | undefined): NavigationTimingData | null {
    if (entry === undefined) return null;
    const fields = ['name', 'entryType', 'startTime', 'duration', 'initiatorType', 'nextHopProtocol', 'workerStart', 'redirectStart', 'redirectEnd', 'fetchStart', 'domainLookupStart', 'domainLookupEnd', 'connectStart', 'connectEnd', 'secureConnectionStart', 'requestStart', 'responseStart', 'responseEnd', 'transferSize', 'encodedBodySize', 'decodedBodySize'] as const;
    const mapped: Record<string, string | number | null> = {};
    for (const field of fields) {
        const candidate = entry[field];
        if (typeof candidate === 'string' || typeof candidate === 'number') mapped[field] = candidate;
    }
    return mapped;
}

function parseDocumentCookies(cookieHeader: string): readonly CookieLike[] {
    if (!cookieHeader.trim()) return [];
    return cookieHeader.split(';').flatMap(part => {
        const separator = part.indexOf('=');
        if (separator <= 0) return [];
        return [{ name: part.slice(0, separator).trim(), value: part.slice(separator + 1).trim() }];
    });
}

async function cookies(page: ParserPageContext): Promise<{ data: readonly CookieLike[]; diagnostics: readonly Diagnostic[] }> {
    const diagnostics: Diagnostic[] = [];
    let storeFailure = false;
    if (page.cookieStore?.getAll !== undefined) {
        try {
            return { data: (await page.cookieStore.getAll()).map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain ?? null,
                path: cookie.path ?? null,
                expires: cookie.expires ?? null,
                secure: cookie.secure ?? null,
                sameSite: cookie.sameSite ?? null,
                partitioned: cookie.partitioned ?? null,
            })), diagnostics };
        } catch {
            storeFailure = true;
            diagnostics.push({ code: 'COOKIE_CAPTURE_FAILED', message: 'Cookie Store access failed; a less-complete document.cookie fallback was attempted.', severity: 'warning' });
        }
    } else {
        diagnostics.push({ code: 'COOKIE_STORE_UNAVAILABLE', message: 'The Cookie Store API was unavailable; a less-complete document.cookie fallback was attempted.', severity: 'warning' });
    }

    const fallback = parseDocumentCookies(page.document.cookie ?? '');
    if (fallback.length > 0) {
        diagnostics.push({ code: 'COOKIE_CAPTURE_FALLBACK', message: 'Cookies were captured through document.cookie and may omit structured attributes.', severity: 'warning' });
        return { data: fallback, diagnostics };
    }

    if (!storeFailure) diagnostics.push({ code: 'COOKIE_CAPTURE_FAILED', message: 'Cookie Store and document.cookie did not provide script-visible cookies.', severity: 'warning' });
    return { data: [], diagnostics };
}

export async function captureGenericPage(page: ParserPageContext): Promise<GenericCaptureResult> {
    const document = page.document;
    const cookieResult = await cookies(page);
    const documentElement = document.documentElement;
    const navigation = page.performance?.getEntriesByType('navigation')[0];
    const data: GenericPageData = {
        url: urlData(page),
        document: {
            title: document.title ?? '',
            referrer: document.referrer ?? '',
            language: value(documentElement, 'lang') ?? '',
            characterSet: document.characterSet ?? '',
            contentType: document.contentType ?? '',
            readyState: document.readyState ?? '',
            lastModified: document.lastModified ?? '',
        },
        meta: metaRecords(page),
        links: metadataLinks(page),
        viewport: {
            width: optionalNumber(page.viewport?.width),
            height: optionalNumber(page.viewport?.height),
            devicePixelRatio: optionalNumber(page.devicePixelRatio),
        },
        screen: {
            width: optionalNumber(page.screen?.width),
            height: optionalNumber(page.screen?.height),
            availableWidth: optionalNumber(page.screen?.availWidth),
            availableHeight: optionalNumber(page.screen?.availHeight),
            colorDepth: optionalNumber(page.screen?.colorDepth),
            pixelDepth: optionalNumber(page.screen?.pixelDepth),
        },
        navigation: mapNavigation(navigation),
        cookies: cookieResult.data,
    };
    return { data, diagnostics: cookieResult.diagnostics };
}

export { parseDocumentCookies };
