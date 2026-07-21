(() => {
    /**
     * Extract the currently open Asana task from its rendered task pane.
     * This reads the DOM only and does not call the Asana API.
     */

    const normalizeText = value =>
        String(value ?? '')
            .replace(/\u200B/g, '')
            .replace(/\r\n?/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

    const text = element =>
        normalizeText(element?.innerText || element?.textContent || '');

    const unique = values =>
        [...new Set(values.map(normalizeText).filter(Boolean))];

    const all = (selector, root = document) =>
        [...root.querySelectorAll(selector)];

    const first = (selectors, root = document) => {
        for (const selector of selectors) {
            const element = root.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    };

    const pane =
        document.querySelector('.TaskPaneBody') ||
        document.querySelector('[class*="TaskPaneBody"]');

    if (!pane) {
        throw new Error(
            'No open Asana task pane was found. Open a task and try again.'
        );
    }

    /**
     * Locate a labeled field row such as:
     *
     * Assignee      No assignee
     * Due date      No due date
     * Dependencies  Add dependencies
     */
    const findLabeledRow = label => {
        const labels = all(
            '.LabeledRowStructure-label, label, h6, [role="heading"]',
            pane
        );

        const labelElement = labels.find(
            element => text(element).toLowerCase() === label.toLowerCase()
        );

        return (
            labelElement?.closest('.LabeledRowStructure') ||
            labelElement?.parentElement?.parentElement?.parentElement?.parentElement ||
            null
        );
    };

    const readLabeledValue = label => {
        const row = findLabeledRow(label);

        if (!row) {
            return null;
        }

        const right =
            row.querySelector('.LabeledRowStructure-right') ||
            row.querySelector('.LabeledRowStructure-content');

        let value = text(right);

        if (!value) {
            value = text(row)
                .split('\n')
                .filter(line => line.toLowerCase() !== label.toLowerCase())
                .join('\n');
        }

        return normalizeText(value) || null;
    };

    const taskURL = location.href;
    const urlMatch = taskURL.match(
        /\/project\/(?<projectId>\d+)\/task\/(?<taskId>\d+)/
    );

    const alternateURLMatch = taskURL.match(
        /\/(?<workspaceId>\d+)\/(?<projectId>\d+)\/[^/?#]*?(?:task\/)?(?<taskId>\d+)(?:[/?#]|$)/
    );

    const ids = urlMatch?.groups || alternateURLMatch?.groups || {};

    /*
     * Task title
     *
     * In the supplied HTML, the open-pane title uses TaskPaneTitle and a
     * textarea inside TitleInput rather than the spreadsheet task-name field.
     */
    const titleElement = first(
        [
            '.TaskPaneTitle textarea',
            '.TaskPaneTitle [role="textbox"]',
            '.TaskPaneTitle .AutogrowTextarea-shadow',
            '.TaskPaneToolbarAnimation-title',
            '[class*="TaskPaneTitle"] textarea',
        ],
        pane
    );

    const title =
        normalizeText(titleElement?.value) ||
        text(titleElement) ||
        document.title
            .replace(/^●\s*/, '')
            .replace(/\s*-\s*Asana\s*$/i, '');

    /*
     * Description
     *
     * The editable description is under .TaskDescription rather than inside
     * the visually empty labeled row.
     */
    const descriptionRoot = first(
        [
            '.TaskDescription',
            '.TaskDescription-textEditor3',
            '[class*="TaskDescription-textEditor"]',
        ],
        pane
    );

    const descriptionEditor = descriptionRoot
        ? first(
            [
                '[contenteditable="true"]',
                '[role="textbox"]',
                '.ProseMirror',
                '[class*="TextEditor"]',
            ],
            descriptionRoot
        )
        : null;

    const removeEditorUI = root => {
        if (!root) {
            return '';
        }

        const clone = root.cloneNode(true);

        clone
            .querySelectorAll(
                [
                    '[class*="Toolbar"]',
                    '[class*="Placeholder"]',
                    '[aria-label="Create task"]',
                    '[data-testid*="toolbar"]',
                    'button',
                ].join(',')
            )
            .forEach(element => element.remove());

        return text(clone)
            .replace(/\n?Create task\s*$/i, '')
            .replace(/\n?Type \/ for menu\s*$/i, '')
            .trim();
    };

    const description =
        removeEditorUI(descriptionEditor) ||
        removeEditorUI(descriptionRoot) ||
        null;

    /*
     * Projects and project-level custom fields
     */
    const projectsRoot = first(
        ['.TaskProjects', '[class*="TaskProjects"]'],
        pane
    );

    const projectLinks = projectsRoot
        ? all('a[href*="/project/"]', projectsRoot).map(link => ({
            name: text(link),
            url: link.href,
            id:
                link.href.match(/\/project\/(\d+)/)?.[1] ||
                link.href.match(/\/(\d+)\/list/)?.[1] ||
                null,
        }))
        : [];

    const projects = [
        ...new Map(
            projectLinks
                .filter(project => project.name)
                .map(project => [project.url || project.name, project])
        ).values(),
    ];

    /*
     * Tags
     */
    const tagsRow =
        findLabeledRow('Tags') ||
        first(['[class*="TaskTags"]', '[class*="Tag"]'], pane);

    const tags = tagsRow
        ? unique(
            all(
                [
                    '[class*="Tag"]',
                    '[class*="Pill"]',
                    '[class*="Token"]',
                    '[role="button"]',
                ].join(','),
                tagsRow
            )
                .map(text)
                .filter(value => !/^tags?$/i.test(value))
                .filter(value => value !== '+')
        )
        : [];

    /*
     * Subtasks
     */
    const subtasksRoot = first(
        ['.TaskPaneSubtasks', '[class*="TaskPaneSubtasks"]'],
        pane
    );

    const subtaskElements = subtasksRoot
        ? all(
            [
                'textarea[aria-label="Task name"]',
                '[class*="Subtask"] textarea',
                '[class*="Subtask"] a',
                '[class*="Subtask"] [role="textbox"]',
            ].join(','),
            subtasksRoot
        )
        : [];

    const subtasks = unique(
        subtaskElements
            .map(element => element.value || text(element))
            .filter(value => !/type to add a subtask/i.test(value))
            .filter(value => !/^subtasks?$/i.test(value))
    );

    /*
     * Attachments
     */
    const attachmentsRoot = first(
        ['.TaskPaneAttachments', '[class*="TaskPaneAttachments"]'],
        pane
    );

    const attachments = attachmentsRoot
        ? all('a[href]', attachmentsRoot)
            .map(link => ({
                name:
                    text(link) ||
                    link.getAttribute('aria-label') ||
                    link.getAttribute('title') ||
                    null,
                url: link.href,
            }))
            .filter(attachment => attachment.name || attachment.url)
        : [];

    /*
     * Activity and comments
     *
     * This extracts only stories currently mounted in the DOM. Asana may
     * virtualize older comments and activity entries.
     */
    const feedRoot = first(
        ['.GenericStoryFeed', '.TaskPane-feed', '[class*="StoryFeed"]'],
        pane
    );

    const storyCandidates = feedRoot
        ? all(
            [
                '[class*="StoryFeed"] > *',
                '[class*="StoryRow"]',
                '[class*="Story"]',
                '[data-testid*="story"]',
                '[data-testid*="comment"]',
            ].join(','),
            feedRoot
        )
        : [];

    const activity = unique(
        storyCandidates
            .map(text)
            .filter(value => value.length > 2)
            .filter(value => !/^(comments|all activity|oldest|newest)$/i.test(value))
    );

    const comments = storyCandidates
        .filter(element => {
            const marker = [
                element.className,
                element.getAttribute?.('data-testid'),
                element.getAttribute?.('aria-label'),
            ]
                .filter(Boolean)
                .join(' ');

            return /comment/i.test(marker);
        })
        .map(element => ({
            text: text(element),
            author:
                text(
                    first(
                        [
                            '[class*="Author"]',
                            '[class*="author"]',
                            '[data-testid*="author"]',
                        ],
                        element
                    )
                ) || null,
            timestamp:
                element.querySelector('time')?.getAttribute('datetime') ||
                text(element.querySelector('time')) ||
                null,
        }))
        .filter(comment => comment.text);

    /*
     * Custom fields
     *
     * Project custom fields are generally rendered as row-like structures
     * beneath the project membership.
     */
    const customFieldRoots = all(
        [
            '[class*="CustomField"]',
            '.TaskProjects [role="row"]',
            '.TaskProjects [class*="Row"]',
        ].join(','),
        pane
    );

    const customFields = {};

    for (const row of customFieldRoots) {
        const lines = text(row)
            .split('\n')
            .map(normalizeText)
            .filter(Boolean);

        if (lines.length < 2 || lines.length > 6) {
            continue;
        }

        const [name, ...rest] = lines;
        const value = rest.join(' — ');

        if (
            name &&
            value &&
            !/^(projects?|description|subtasks?|attachments?)$/i.test(name)
        ) {
            customFields[name] ??= value;
        }
    }

    const task = {
        source: 'asana-dom',
        capturedAt: new Date().toISOString(),

        ids: {
            workspaceId: ids.workspaceId || null,
            projectId: ids.projectId || null,
            taskId: ids.taskId || null,
        },

        url: taskURL,
        title,

        assignee: readLabeledValue('Assignee'),
        dueDate: readLabeledValue('Due date'),
        dependencies: readLabeledValue('Dependencies'),

        tags,
        projects,
        customFields,

        description,
        subtasks,
        attachments,
        comments,
        activity,
    };

    console.log('Parsed Asana task:', task);
    console.table({
        title: task.title,
        assignee: task.assignee,
        dueDate: task.dueDate,
        dependencies: task.dependencies,
        projects: task.projects.map(project => project.name).join(', '),
        tags: task.tags.join(', '),
        subtasks: task.subtasks.length,
        attachments: task.attachments.length,
        comments: task.comments.length,
        activityEntries: task.activity.length,
    });

    return task;
})();