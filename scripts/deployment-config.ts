import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface BundleDeploymentConfig {
    readonly gist: string;
    readonly filename: string;
    readonly owner?: string;
}

interface PackageJson {
    readonly repository?: { readonly url?: string };
    readonly config?: { readonly deployments?: { readonly bundle?: Partial<BundleDeploymentConfig> } };
}

export async function readPackageConfig(root: string): Promise<{ packageJson: PackageJson; bundle: Partial<BundleDeploymentConfig> | undefined }> {
    const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')) as PackageJson;
    return { packageJson, bundle: packageJson.config?.deployments?.bundle };
}

function repositoryOwner(repositoryUrl: string | undefined): string | undefined {
    if (!repositoryUrl) return undefined;
    try {
        const path = new URL(repositoryUrl).pathname.replace(/\.git$/u, '').split('/').filter(Boolean);
        return path[0];
    } catch {
        return undefined;
    }
}

export async function loadBundleConfig(root: string): Promise<{ gist: string; filename: string; owner: string }> {
    const { packageJson, bundle } = await readPackageConfig(root);
    const gist = process.env.BROWSER_PARSER_GIST_ID ?? bundle?.gist ?? '';
    const filename = process.env.BROWSER_PARSER_GIST_FILENAME ?? bundle?.filename ?? '';
    const owner = process.env.BROWSER_PARSER_GIST_OWNER ?? bundle?.owner ?? repositoryOwner(packageJson.repository?.url) ?? '';
    if (!gist.trim()) throw new Error('Missing bundle gist ID. Configure package.json.config.deployments.bundle.gist or BROWSER_PARSER_GIST_ID.');
    if (!filename.trim()) throw new Error('Missing bundle gist filename. Configure package.json.config.deployments.bundle.filename or BROWSER_PARSER_GIST_FILENAME.');
    if (!owner.trim()) throw new Error('Missing bundle gist owner. Configure package.json.repository or BROWSER_PARSER_GIST_OWNER.');
    return { gist, filename, owner };
}

export function rawGistUrl(config: BundleDeploymentConfig): string {
    return `https://gist.githubusercontent.com/${encodeURIComponent(config.owner ?? '')}/${encodeURIComponent(config.gist)}/raw/${encodeURIComponent(config.filename)}`;
}
