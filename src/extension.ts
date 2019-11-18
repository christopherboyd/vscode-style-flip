import * as vscode from 'vscode';
import { StyleFlip } from './styleflip';

export function activate(context: vscode.ExtensionContext) {

	let styleflip = new StyleFlip();

	let disposable = vscode.commands.registerCommand('styleflip.flip', () => {
		styleflip.flip();
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
