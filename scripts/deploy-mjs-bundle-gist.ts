import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { loadBundleConfig } from './deployment-config.ts';

export interface CommandResult { readonly stdout: string; readonly stderr: string }
export type CommandRunner = (args: readonly string[], input?: string) => Promise<CommandResult>;

export interface DeployOptions {
    readonly root: string;
    readonly config: { readonly gist: string; readonly filename: string };
    readonly run: CommandRunner;
    readonly build?: () => Promise<void>;
    readonly bundle?: string;
}

function ghRunner(root: string): CommandRunner {
    return (args, input) => new Promise((resolvePromise, reject) => {
        const child = spawn('gh', args, { cwd: root, stdio: 'pipe', windowsHide: true });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => { stdout += String(chunk); });
        child.stderr.on('data', chunk => { stderr += String(chunk); });
        child.on('error', reject);
        child.on('close', code => code === 0 ? resolvePromise({ stdout, stderr }) : reject(new Error(`gh command failed (${code}): ${stderr.trim()}`)));
        if (input !== undefined) child.stdin.write(input);
        child.stdin.end();
    });
}

function parseJson<T>(result: CommandResult): T {
    return JSON.parse(result.stdout) as T;
}

export async function deployBundle(options: DeployOptions): Promise<{ readonly checksum: string }> {
    if (options.build) await options.build();
    const bundle = options.bundle ?? await readFile(resolve(options.root, 'dist/esnext.bundle.mjs'), 'utf8');
    const checksum = createHash('sha256').update(bundle).digest('hex');
    await options.run(['auth', 'status']);
    await options.run(['api', `/gists/${options.config.gist}`]);
    const payload = JSON.stringify({ files: { [options.config.filename]: { content: bundle } } });
    await options.run(['api', '--method', 'PATCH', `/gists/${options.config.gist}`, '--input', '-'], payload);
    const verified = parseJson<{ readonly files?: Record<string, { readonly content?: string }> }>(await options.run(['api', `/gists/${options.config.gist}`]));
    const remoteContent = verified.files?.[options.config.filename]?.content;
    if (remoteContent === undefined || createHash('sha256').update(remoteContent).digest('hex') !== checksum) throw new Error('Remote gist verification failed.');
    return { checksum };
}

if (import.meta.main) {
    const root = resolve(import.meta.dirname, '..');
    const config = await loadBundleConfig(root);
    const result = await deployBundle({
        root,
        config,
        run: ghRunner(root),
        build: async () => {
            const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            await new Promise<void>((resolvePromise, reject) => {
                const child = spawn(npm, ['run', 'build:mjs-bundle'], { cwd: root, stdio: 'inherit', windowsHide: true });
                child.on('error', reject);
                child.on('close', code => code === 0 ? resolvePromise() : reject(new Error(`Bundle build failed with code ${code}.`)));
            });
        },
    });
    console.log(`Deployed ${config.filename}; checksum ${result.checksum}.`);
}
