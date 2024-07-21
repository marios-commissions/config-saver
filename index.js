const { rmSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync, readFileSync } = require('node:fs');
const config = require('./config.json');
const { join } = require('node:path');
const zl = require('zip-lib');

const root = join(__dirname, '..');
const save = join(__dirname, 'configs.zip');

async function run() {
	const projects = readdirSync(root);

	if (existsSync(save)) rmSync(save, { recursive: true });


	const zip = new zl.Zip();

	for (const project of projects) {
		const path = join(root, project);
		if (!statSync(path).isDirectory()) continue;

		const configPath = join(path, 'config.json');
		if (!existsSync(configPath)) continue;

		console.log('Saving config for', project);

		await zip.addFile(configPath, `${project}/config.json`);
	}

	await zip.archive(save);
	await sendToDiscord();
}

async function sendToDiscord() {
	try {
		const data = new FormData();
		const content = readFileSync(save);

		data.append('payload_json', JSON.stringify({ username: config.username }));

		data.append('file0', new Blob([content]), 'configs.zip');

		const res = await fetch(config.webhook, {
			method: 'POST',
			body: data
		});

		if (!res.ok) {
			const data = await res.json();

			if (!data.retry_after) {
				console.error('Received error:', data);
				return;
			}

			console.log(`Hit ratelimit, waiting ${data.retry_after * 1000}ms.`);
			await sleep(data.retry_after * 1000);
			await sendToDiscord();
		}
	} catch (error) {
		console.error('Failed to post zip:', error);
	}
}

run();