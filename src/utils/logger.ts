import vscode from 'vscode';

export class Logger {
  static channel: vscode.OutputChannel;

  static log(message: any) {
    if (this.channel) {
      const currentTime = new Date();
      this.channel.appendLine(`[${currentTime}] [INFO] ${message}`);
    }
  }

  static debug(message: any) {
    if (this.channel && process.env.NODE_ENV === 'development') {
      const currentTime = new Date();
      this.channel.appendLine(`[${currentTime}] [DEBUG] ${message}`);
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