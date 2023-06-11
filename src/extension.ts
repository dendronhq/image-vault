// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { spawn } from 'child_process';
import path = require('path');
import fs from "fs";
import vscode from 'vscode';

class Logger {
	static channel: vscode.OutputChannel;

	static log(message: any) {
		if (this.channel) {
			const currentTime = new Date();
			this.channel.appendLine(`[${currentTime}] ${message}`);
		}
	}

	static showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined> {
		this.log(message);
		return vscode.window.showInformationMessage(message, ...items);
	}

	static showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined> {
		this.log(message);
		return vscode.window.showErrorMessage(message, ...items);
	}
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.pasteImage', async () => {
		try {
			Paster.paste();
		} catch (e) {
			// @ts-ignore
			Logger.showErrorMessage(e);
		}
	}));

}

class Paster {
	public static async paste() {
		// get current edit file path
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const fileUri = editor.document.uri;
		if (!fileUri) return;
		if (fileUri.scheme === 'untitled') {
			Logger.showInformationMessage('Before pasting the image, you need to save current file first.');
			return;
		}

		const imagePath = this.getImagePath();
		await this.saveAndPaste(editor, imagePath);
	}


	public static getImagePath() {
		const HARDCODED_PATH_CHANGEME = '/tmp/imagevault';
		return HARDCODED_PATH_CHANGEME;
	}

	public static saveAndPaste(editor: vscode.TextEditor, imagePath: string) {
		return new Promise((resolve) => {
			this.saveClipboardImageToFileAndGetPath(imagePath, (imagePath, imagePathReturnByScript) => {
				if (!imagePathReturnByScript) return;
				if (imagePathReturnByScript === 'no image') {
					Logger.showInformationMessage('There is not an image in the clipboard.');
					return;
				}
				// imagePath = this.renderFilePath(editor.document.languageId, this.basePathConfig, imagePath, this.forceUnixStyleSeparatorConfig, this.prefixConfig, this.suffixConfig);
				editor.edit(edit => {
					const current = editor.selection;

					if (current.isEmpty) {
						edit.insert(current.start, imagePath);
					} else {
						edit.replace(current, imagePath);
					}
					resolve(imagePath);
				});
			});

		});
	}

	private static saveClipboardImageToFileAndGetPath(imagePath: string, cb: (imagePath: string, imagePathFromScript: string) => void) {
		if (!imagePath) return;

		const platform = process.platform;
		if (platform === 'win32') {
			// Windows
			const scriptPath = path.join(__dirname, '../../res/pc.ps1');

			let command = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
			const powershellExisted = fs.existsSync(command);
			if (!powershellExisted) {
				command = "powershell";
			}

			const powershell = spawn(command, [
				'-noprofile',
				'-noninteractive',
				'-nologo',
				'-sta',
				'-executionpolicy', 'unrestricted',
				'-windowstyle', 'hidden',
				'-file', scriptPath,
				imagePath
			]);
			powershell.on('error', function (e) {
				if (e.code == "ENOENT") {
					Logger.showErrorMessage(`The powershell command is not in you PATH environment variables. Please add it and retry.`);
				} else {
					Logger.showErrorMessage(e);
				}
			});
			powershell.on('exit', function (code, signal) {
				// console.log('exit', code, signal);
			});
			powershell.stdout.on('data', function (data: Buffer) {
				cb(imagePath, data.toString().trim());
			});
		}
		else if (platform === 'darwin') {
			// Mac
			const scriptPath = path.join(__dirname, '../../res/mac.applescript');

			const ascript = spawn('osascript', [scriptPath, imagePath]);
			ascript.on('error', function (e) {
				Logger.showErrorMessage(e);
			});
			ascript.on('exit', function (code, signal) {
				// console.log('exit',code,signal);
			});
			ascript.stdout.on('data', function (data: Buffer) {
				cb(imagePath, data.toString().trim());
			});
		} else {
			// Linux 

			const scriptPath = path.join(__dirname, '../../res/linux.sh');

			const ascript = spawn('sh', [scriptPath, imagePath]);
			ascript.on('error', function (e) {
				Logger.showErrorMessage(e);
			});
			ascript.on('exit', function (code, signal) {
				// console.log('exit',code,signal);
			});
			ascript.stdout.on('data', function (data: Buffer) {
				const result = data.toString().trim();
				if (result == "no xclip") {
					Logger.showInformationMessage('You need to install xclip command first.');
					return;
				}
				cb(imagePath, result);
			});
		}
	}
}