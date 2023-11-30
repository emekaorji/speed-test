import * as vscode from 'vscode';

import helloWorld from './helloWorld';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('VSCodeExtensionBoilerplate.helloVSCode', () => helloWorld()),
  );

  let myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
  myStatusBarItem.command = 'VSCodeExtensionBoilerplate.helloVSCode';
  myStatusBarItem.text = `BrockLesnar`;
  myStatusBarItem.tooltip = 'BrockLesnar';

  // @ts-ignore
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    var speed = connection.downlink || connection.bandwidth;
    vscode.window.showInformationMessage('Internet Speed: ' + speed + ' Mbps');
  } else {
    vscode.window.showInformationMessage('Unable to retrieve internet speed information');
  }

  context.subscriptions.push(myStatusBarItem);

  myStatusBarItem.show();
}

const measureSpeed = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const startTime = performance.now();
  const response = await fetch('https://speed-test-resource.vercel.app/index.txt', {
    signal: controller.signal,
  });
  const reader = response.body?.getReader();
  const readResult = await reader?.read();
  console.log(readResult);

  const endTime = performance.now();
  const durationInSeconds = (endTime - startTime) / 1000;
  const speedMbps = (5 * 1024 * 1024) / 1024 / 1024 / durationInSeconds;
  clearTimeout(timeoutId);
};

export function deactivate(): void {
  // recycle resource...
}
