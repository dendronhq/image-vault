import { spawn } from 'child_process';
import fs from "fs";
import moment from 'moment';
import vscode from 'vscode';
import { CONSTANTS } from './constants';
import { createImageHoverProvider } from './providers';
import { createExtensionContextProvider, getExtensionContext } from './providers/extensionContextProvider';
import { getTmpFolder } from './utils';
import { AWSUtils } from './utils/aws';
import { Logger } from './utils/logger';
import { retrieveUserSecrets, storeUserSecrets } from './utils/secrets';
import { getConfig } from './utils/vscode';
import path from 'path';
import mime from 'mime';



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	Logger.channel = vscode.window.createOutputChannel(CONSTANTS.EXTENSION_NAMESPACE);
	if (process.env.NODE_ENV === 'development') {
		Logger.channel.show(true);
	}

	// --- initialize providers
	context.subscriptions.push(createImageHoverProvider);
	createExtensionContextProvider(context);

	// --- initialize commands
	context.subscriptions.push(vscode.commands.registerCommand('extension.pasteImage', async () => {
		try {
			Paster.paste();
		} catch (e) {
			// @ts-ignore
			Logger.showErrorMessage(e);
		}
	}));

	vscode.commands.registerCommand('extension.storeSecret', async() => {
    const secretValue = await vscode.window.showInputBox({
      prompt: 'Enter the AWS secret key:',
      placeHolder: 'e.g., mySecretValue',
      password: true
    });

    if (!secretValue) {
      vscode.window.showErrorMessage('no value set');
      return;
    }
		return storeUserSecrets(context, CONSTANTS.AWS_SECRET_KEY, secretValue);
	});

	Logger.log("Extension activated");

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
		const tmpPath = getTmpFolder();
		const imageFileName = path.join(tmpPath, moment().format("Y-MM-DD-HH-mm-ss") + ".png");
		return imageFileName;
	}

	public static saveAndPaste(editor: vscode.TextEditor, imagePath: string) {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise((resolve, reject) => {
			this.saveClipboardImageToFileAndGetPath(imagePath, async (imagePath, imagePathReturnByScript) => {
				if (!imagePathReturnByScript) return;
				if (imagePathReturnByScript === 'no image') {
					Logger.showInformationMessage('There is not an image in the clipboard.');
					return;
				}

				Logger.log("uploading image to s3...");
				// read image and upload to s3
				const data = fs.readFileSync(imagePath);
				const mimeType = mime.getType(imagePath);

				// get secret key
				const context = getExtensionContext();
				const secret = await retrieveUserSecrets(context, CONSTANTS.AWS_SECRET_KEY);
				if (secret === undefined) {
					Logger.showErrorMessage("secret key is not set, please set it by using command: 'Paste Image: Set AWS Secret Key'");
					return reject(new Error("secret key is not set"));
				}
				const client = AWSUtils.getS3Client(secret);
				const { bucketName, bucketPrefix, region } = getConfig();
				if (mimeType === null) {
					Logger.showInformationMessage(`Can't paste the image, unsupported file format: ${imagePath}`);
					return;
				}

				const key = `${bucketPrefix}/${path.basename(imagePath)}`;
				try {
					const resp = await AWSUtils.putObject({ client, bucketName, data, mime: mimeType, key: key });
					Logger.log(`uploaded to s3 status: ${resp.$metadata.httpStatusCode}`);
				} catch(err) {
					if (AWSUtils.isAWSError(err)) {
						Logger.error(AWSUtils.stringifyAWSError(err));
						Logger.showErrorMessage(`Error uploading to s3: ${err.message}`);
						reject(err);
					} else {
						Logger.showErrorMessage(`Error uploading to s3: ${err}`);
					}
				}

				const baseUrl = `https://${bucketName}.s3.${region}.amazonaws.com`;


				imagePath = this.renderFilePath({ imageFilePath: imagePath, basePath: bucketPrefix, baseUrl });
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

	public static renderFilePath(opts: { imageFilePath: string, basePath: string, baseUrl: string }): string {
		// eslint-disable-next-line prefer-const
		let { imageFilePath, basePath, baseUrl } = opts;
		imageFilePath = path.normalize(imageFilePath);
		imageFilePath = `${baseUrl}/${basePath}/${path.basename(imageFilePath)}`;
		imageFilePath = `![](${imageFilePath})`;
		return imageFilePath;
	}


	private static saveClipboardImageToFileAndGetPath(imagePath: string, cb: (imagePath: string, imagePathFromScript: string) => Promise<void>) {
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
				// @ts-ignore
				if (e.code == "ENOENT") {
					Logger.showErrorMessage(`The powershell command is not in you PATH environment variables. Please add it and retry.`);
				} else {
					Logger.showErrorMessage(e.message);
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
				Logger.showErrorMessage(e.message);
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
				Logger.showErrorMessage(e.message);
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