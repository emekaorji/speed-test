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
	myStatusBarItem.text = `$(loading~spin)$(arrow-down)0$(arrow-up)0`;
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
			myStatusBarItem.text = `$(loading~spin)$(arrow-down)0$(arrow-up)0`;
			await getSpeed().forEach((result_) => {
				result = result_;
				myStatusBarItem.text = `$(loading~spin)$(arrow-down)${result.downloadSpeed}${result.downloadUnit}$(arrow-up)${result.uploadSpeed}${result.uploadUnit}`;
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
			myStatusBarItem.text = `$(ports-open-browser-icon)$(arrow-down)${result.downloadSpeed}${result.downloadUnit}$(arrow-up)${result.uploadSpeed}${result.uploadUnit}`;
			myStatusBarItem.tooltip = new vscode.MarkdownString(
				`### $(ports-open-browser-icon) Speed Test Status\n\nDownload Speed - ${result.downloadSpeed}${result.downloadUnit}\n\nUpload Speed - ${result.uploadSpeed}${result.uploadUnit}\n\n##### _Last checked at ${lastCheckedDate}_`,
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
				myStatusBarItem.text = `$(ports-open-browser-icon)$(arrow-down)${result.downloadSpeed}${result.downloadUnit}$(arrow-up)${result.uploadSpeed}${result.uploadUnit}`;
				myStatusBarItem.tooltip = new vscode.MarkdownString(
					`### $(ports-open-browser-icon) Speed Test Status\n\nDownload Speed - ${result.downloadSpeed}${result.downloadUnit}\n\nUpload Speed - ${result.uploadSpeed}${result.uploadUnit}\n\n##### _Last checked at ${lastCheckedDate}_`,
					true,
				);
				const selection = await vscode.window.showWarningMessage(
					`Speed Test Aborted. Download - ${result.downloadSpeed}${result.downloadUnit} | Upload - ${result.uploadSpeed}${result.uploadUnit}`,
					'Run again',
				);
				if (selection === 'Run again') runSpeedTestWithReport();
			} else if (error.message.startsWith('net::ERR_INTERNET_DISCONNECTED')) {
				myStatusBarItem.text = `$(error) No Network Error`;
				myStatusBarItem.tooltip = new vscode.MarkdownString(
					`### $(ports-open-browser-icon) Speed Test Status\n\nCan't test network speed as you are not connected to the internet`,
					true,
				);
				const selection = await vscode.window.showErrorMessage(
					"Can't test network speed as you are not connected to the internet",
					'Retry',
				);
				if (selection === 'Retry') runSpeedTestWithReport();
			} else if (error.message.startsWith('net::ERR_SSL_PROTOCOL_ERROR')) {
				myStatusBarItem.text = `$(error) Service Error`;
				myStatusBarItem.tooltip = new vscode.MarkdownString(
					`### $(ports-open-browser-icon) Speed Test Status\n\nThere is an error with our speed test service.\n\nPlease [create an issue](https://github.com/emekaorji/speed-test/issues/new?title=Service+Error+net::ERR_SSL_PROTOCOL_ERROR) to let us know.`,
					true,
				);
				const selection = await vscode.window.showErrorMessage(
					'There is an error with our speed test service. Please create an issue to let us know.',
					'Retry',
					'Create Issue',
				);
				if (selection === 'Retry') runSpeedTestWithReport();
				if (selection === 'Create Issue')
					vscode.env.openExternal(
						vscode.Uri.parse(
							`https://github.com/emekaorji/speed-test/issues/new?title=Service+Error+net::ERR_SSL_PROTOCOL_ERROR`,
						),
					);
			} else {
				myStatusBarItem.text = `$(error) Speed Test Error`;
				myStatusBarItem.tooltip = new vscode.MarkdownString(
					`### $(ports-open-browser-icon) Speed Test Status\n\nAn unknown error occured`,
					true,
				);
				const selection = await vscode.window.showErrorMessage(error.message, 'Retry');
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
