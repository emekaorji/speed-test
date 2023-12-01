import { resolve } from 'node:path';

import { runTests } from '@vscode/test-electron';

(async function go() {
	const projectPath = resolve(__dirname, '../../');
	const extensionDevelopmentPath = projectPath;
	const extensionTestsPath = resolve(projectPath, './out/test');
	const testWorkspace = resolve(projectPath, './test-workspace');

	try {
		await runTests({
			version: 'insiders',
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: ['--disable-extensions', testWorkspace],
		});
	} catch (error) {
		console.log(error);
	}
})();
