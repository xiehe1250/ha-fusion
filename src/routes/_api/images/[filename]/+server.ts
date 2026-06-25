import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'path';

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.filename;
	if (!filename) {
		return error(400, 'Missing filename');
	}

	const isAddon = process.env.ADDON === 'true' || !!process.env.SUPERVISOR_TOKEN;
	const DATA_DIR = isAddon ? '/data' : './data';
	const filePath = path.join(DATA_DIR, 'uploads', filename);

	if (!existsSync(filePath)) {
		return error(404, 'Image not found');
	}

	try {
		const data = await readFile(filePath);
		
		// Determine Content-Type
		const ext = path.extname(filename).toLowerCase();
		let contentType = 'image/png';
		if (ext === '.jpg' || ext === '.jpeg') {
			contentType = 'image/jpeg';
		} else if (ext === '.gif') {
			contentType = 'image/gif';
		} else if (ext === '.webp') {
			contentType = 'image/webp';
		} else if (ext === '.svg') {
			contentType = 'image/svg+xml';
		}

		return new Response(data, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000'
			}
		});
	} catch (err: any) {
		return error(500, 'Failed to read image file');
	}
};
