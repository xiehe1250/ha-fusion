import { handler } from './build/handler.js';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const app = express();

// environment
dotenv.config();
const ADDON = process.env.ADDON === 'true' || !!process.env.SUPERVISOR_TOKEN;
const { PORT, HASS_PORT, EXPOSED_PORT } = process.env;

// Initialize /data directory in HA Addon mode
if (ADDON) {
	const srcDir = './data';
	const destDir = '/data';
	try {
		if (!fs.existsSync(destDir)) {
			fs.mkdirSync(destDir, { recursive: true });
		}
		const filesToCopy = ['configuration.yaml', 'dashboard.yaml', 'custom_javascript.js', 'version.json'];
		for (const file of filesToCopy) {
			const srcFile = path.join(srcDir, file);
			const destFile = path.join(destDir, file);
			if (!fs.existsSync(destFile) && fs.existsSync(srcFile)) {
				fs.copyFileSync(srcFile, destFile);
				console.log(`Copied default ${file} to /data/`);
			}
		}
	} catch (err) {
		console.error('Failed to initialize /data directory:', err);
	}
}

// dynamically set target
const entryMiddleware = async (req, res, next) => {
	// default
	let target = process.env.HASS_URL || (ADDON ? 'http://supervisor/core' : undefined);

	if (ADDON) {
		// headers
		const {
			'x-hass-source': source,
			'x-forwarded-proto': forwardedProto,
			'x-forwarded-host': forwardedHost,
			host
		} = req.headers;

		// ingress
		if (source && forwardedProto && forwardedHost) {
			target = `${forwardedProto}://${forwardedHost}`;
		}

		// exposed port
		else if (host && EXPOSED_PORT && HASS_PORT) {
			const proto = req.secure ? 'https' : 'http';
			target = `${proto}://${host.replace(EXPOSED_PORT, HASS_PORT)}`;
		}
	}

	// target should be defined now
	if (!target) {
		throw new Error('Proxy target could not be determined');
	}

	// add header for +page.server.ts
	req.headers['X-Proxy-Target'] = target;
	req.target = target;
	next();
};

// production proxy
const proxy = createProxyMiddleware({
	pathFilter: ['/local/', '/api/'],
	router: (req) => req.target,
	changeOrigin: true
});

app.use(entryMiddleware, proxy);

// let SvelteKit handle everything else, including serving prerendered pages and static assets
app.use(handler);

const LISTEN_PORT = ADDON ? 8099 : PORT;
app.listen(LISTEN_PORT, () => {
	if (ADDON) {
		console.log('ADDON:', ADDON);
		console.log('INGRESS_PORT:', LISTEN_PORT);
		console.log('EXPOSED_PORT:', EXPOSED_PORT);
		console.log('HASS_PORT:', HASS_PORT);
	} else {
		console.log('HASS_URL:', process.env.HASS_URL);
		console.log('PORT:', LISTEN_PORT);
		console.log('ADDON:', ADDON);
	}
});
