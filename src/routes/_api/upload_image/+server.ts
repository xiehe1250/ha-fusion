import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return error(400, 'No file uploaded');
		}

		const isAddon = process.env.ADDON === 'true' || !!process.env.SUPERVISOR_TOKEN;
		const DATA_DIR = isAddon ? '/data' : './data';

		// Create upload directory if it doesn't exist
		const uploadDir = path.join(DATA_DIR, 'uploads');
		if (!existsSync(uploadDir)) {
			await mkdir(uploadDir, { recursive: true });
		}

		// Generate a safe unique filename
		const ext = path.extname(file.name) || '.png';
		const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
		const filePath = path.join(uploadDir, safeName);

		// Write file
		const arrayBuffer = await file.arrayBuffer();
		await writeFile(filePath, Buffer.from(arrayBuffer));

		return json({
			url: `_api/images/${safeName}`
		});
	} catch (err: any) {
		console.error('Image upload error:', err);
		return error(500, err.message || 'Failed to upload image');
	}
};
