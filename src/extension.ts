import * as vscode from 'vscode';

import type { Result } from './getSpeed';
import { getSpeed } from './getSpeed';

type Progress = vscode.Progress<{
	message?: string | undefined;
	increment?: number | undefined;
}>;

export function activate(context: vscode.ExtensionContext) {
	const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	myStatusBarItem.command = 'SpeedTest.testSpeed';
	myStatusBarItem.name = 'Speed Test';
	myStatusBarItem.text = `$(loading~spin)$(arrow-small-down)0$(arrow-small-up)0`;
	myStatusBarItem.tooltip = new vscode.MarkdownString(
		'$(ports-open-browser-icon) Speed Test Running',
		true,
	);
	context.subscriptions.push(myStatusBarItem);
	myStatusBarItem.show();

	let isRunning = false;
	let progress: Progress | undefined;
	let abortController = new AbortController();

	async function runSpeedTest() {
		if (isRunning) return;

		let result: Result | undefined;
		const lastCheckedDate = new Date().toUTCString();

		try {
			isRunning = true;
			myStatusBarItem.text = `$(loading~spin)$(arrow-small-down)0$(arrow-small-up)0`;
			await getSpeed().forEach((result_) => {
				result = result_;
				myStatusBarItem.text = `$(loading~spin)$(arrow-small-down)${result.downloadSpeed}${result.downloadUnit}$(arrow-small-up)${result.uploadSpeed}${result.uploadUnit}`;
				if (progress) {
					progress.report({
						message: `Download: ${result.downloadSpeed}${result.downloadUnit} | Upload: ${result.uploadSpeed}${result.uploadUnit}`,
					});
				}
				if (abortController.signal.aborted) {
					abortController = new AbortController();
					// eslint-disable-next-line no-throw-literal
					throw { name: 'Aborted' };
				}
			});
			isRunning = false;
			if (!result) throw new Error('Could not detect network speed');
			myStatusBarItem.text = `$(ports-open-browser-icon)$(arrow-small-down)${result.downloadSpeed}${result.downloadUnit}$(arrow-small-up)${result.uploadSpeed}${result.uploadUnit}`;
			myStatusBarItem.tooltip = new vscode.MarkdownString(
				`### $(ports-open-browser-icon) Speed Test Status\n\nDownload Speed - ${result.downloadSpeed}${result.downloadUnit}\n\nUpload Speed - ${result.uploadSpeed}${result.uploadUnit}\n\n__Last checked at ${lastCheckedDate}__`,
				true,
			);
			const selection = await vscode.window.showInformationMessage(
				`Speed test completed successfully. Download - ${result.downloadSpeed}${result.downloadUnit} | Upload - ${result.uploadSpeed}${result.uploadUnit}`,
				'Run again',
			);
			if (selection === 'Run again') runSpeedTestWithReport();
		} catch (error: any) {
			isRunning = false;
			if (error.name === 'Aborted' && result) {
				myStatusBarItem.text = `$(ports-open-browser-icon)$(arrow-small-down)${result.downloadSpeed}${result.downloadUnit}$(arrow-small-up)${result.uploadSpeed}${result.uploadUnit}`;
				myStatusBarItem.tooltip = new vscode.MarkdownString(
					`### $(ports-open-browser-icon) Speed Test Status\n\nDownload Speed - ${result.downloadSpeed}${result.downloadUnit}\n\nUpload Speed - ${result.uploadSpeed}${result.uploadUnit}\n\n__Last checked at ${lastCheckedDate}__`,
					true,
				);
				const selection = await vscode.window.showWarningMessage(
					`Speed Test Aborted. Download - ${result.downloadSpeed}${result.downloadUnit} | Upload - ${result.uploadSpeed}${result.uploadUnit}`,
					'Run again',
				);
				if (selection === 'Run again') runSpeedTestWithReport();
			} else {
				console.log(error.code, error.name, error.message);
				myStatusBarItem.text = `$(error) Speed Test Error`;
				const selection = await vscode.window.showErrorMessage(error, 'Retry');
				if (selection === 'Retry') runSpeedTestWithReport();
			}
		}
	}

	function showProgressReport() {
		if (progress) return;
		vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: 'Speed Test', cancellable: true },
			async (progress_, token) => {
				progress = progress_;
				token.onCancellationRequested(() => {
					abortController.abort();
				});

				return new Promise((resolve) => {
					const intervalId = setInterval(() => {
						if (!isRunning) {
							progress = undefined;
							resolve('');
							clearInterval(intervalId);
						}
					}, 100);
				});
			},
		);
	}

	function runSpeedTestWithReport() {
		runSpeedTest();
		showProgressReport();
	}

	const disposable = vscode.commands.registerCommand('SpeedTest.testSpeed', () =>
		runSpeedTestWithReport(),
	);

	context.subscriptions.push(disposable);

	runSpeedTest();
}

export function deactivate() {}
