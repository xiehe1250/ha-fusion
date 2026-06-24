import { writeFile } from 'fs/promises';
import { json } from '@sveltejs/kit';
import yaml from 'js-yaml';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	let data;
	try {
		data = yaml.dump(body);
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON - cannot convert to YAML' }), {
			status: 400
		});
	}

	const isAddon = process.env.ADDON === 'true' || !!process.env.SUPERVISOR_TOKEN;
	const DATA_DIR = isAddon ? '/data' : './data';

	try {
		await writeFile(`${DATA_DIR}/configuration.yaml`, data);
		return json({ action: 'saved' });
	} catch (error) {
		return new Response(JSON.stringify({ error: error }), {
			status: 400
		});
	}
};
