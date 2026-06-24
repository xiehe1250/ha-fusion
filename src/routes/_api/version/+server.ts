import { readFile, writeFile } from 'fs/promises';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// load
export const GET: RequestHandler = async () => {
	try {
		const isAddon = process.env.ADDON === 'true' || !!process.env.SUPERVISOR_TOKEN;
		const DATA_DIR = isAddon ? '/data' : './data';
		const [packageFile, versionFile] = await Promise.all([
			readFile('./package.json', 'utf8').catch(() => '{}'),
			readFile(`${DATA_DIR}/version.json`, 'utf8').catch(() => '{}')
		]);

		const packageData = JSON.parse(packageFile);
		const versionData = JSON.parse(versionFile);

		return json({
			installed: packageData?.version,
			latest: versionData?.latest,
			last_updated: versionData?.last_updated
		});
	} catch (err: any) {
		error(500, err);
	}
};

// save
export const POST: RequestHandler = async ({ request }) => {
	try {
		const isAddon = process.env.ADDON === 'true' || !!process.env.SUPERVISOR_TOKEN;
		const DATA_DIR = isAddon ? '/data' : './data';
		const body = await request.json();
		const data = JSON.stringify(body, null, '\t') + '\n';
		await writeFile(`${DATA_DIR}/version.json`, data);
		return json({ message: 'success' });
	} catch (err: any) {
		return error(500, err);
	}
};
