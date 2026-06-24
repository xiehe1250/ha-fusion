import { writeFile } from 'fs/promises';
import { json, error } from '@sveltejs/kit';
import yaml from 'js-yaml';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	let data;

	try {
		data = yaml.dump(body);
	} catch (err: any) {
		error(500, err.message);
	}

	const isAddon = process.env.ADDON === 'true' || !!process.env.SUPERVISOR_TOKEN;
	const DATA_DIR = isAddon ? '/data' : './data';

	try {
		await writeFile(`${DATA_DIR}/dashboard.yaml`, data);
		return json({ message: 'saved' });
	} catch (err: any) {
		error(500, err.message);
	}
};
