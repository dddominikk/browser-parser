import type { AsanaTaskPreview, Diagnostic, Parser, ParserElement, ParserPageContext } from '../contracts.ts';

function text(element: ParserElement | null): string | null {
    const value = element?.value ?? element?.textContent ?? null;
    const normalized = value?.trim() ?? '';
    return normalized || null;
}

function taskIdFromUrl(url: string): string | null {
    return /\/task\/(\d+)(?:[/?#]|$)/.exec(url)?.[1] ?? null;
}

export const asanaParser: Parser<AsanaTaskPreview> = {
    id: 'asana',
    matches(page) {
        return page.host === 'app.asana.com';
    },
    parse(page) {
        const pane = page.document.querySelector('.TaskPaneBody');
        if (pane === null) {
            return {
                data: { taskId: null, taskTitle: null },
                summary: [],
                diagnostics: [{ code: 'ASANA_NO_OPEN_TASK', message: 'No open Asana task pane was found.', severity: 'warning' }],
            };
        }

        const taskId = taskIdFromUrl(page.url);
        const taskTitle = text(pane.querySelector?.('.TaskPaneTitle textarea') ?? null);
        const diagnostics: Diagnostic[] = [];
        if (taskId === null) diagnostics.push({ code: 'ASANA_TASK_ID_MISSING', message: 'The Asana task ID was not available in the supplied URL.', severity: 'warning' });
        if (taskTitle === null) diagnostics.push({ code: 'ASANA_TASK_TITLE_MISSING', message: 'The open Asana task title was not available.', severity: 'warning' });
        const summary = [
            ...(taskId === null ? [] : [{ label: 'Task ID', value: taskId }]),
            ...(taskTitle === null ? [] : [{ label: 'Task title', value: taskTitle }]),
        ];
        return { data: { taskId, taskTitle }, summary, diagnostics };
    },
};
