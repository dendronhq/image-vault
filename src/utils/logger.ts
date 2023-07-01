import vscode from 'vscode';

enum LogLevel {
  "INFO" = "INFO",
  "DEBUG" = "DEBUG",
  "ERROR" = "ERROR",
}

export class Logger {
  static channel: vscode.OutputChannel;

  static _log(opts: {message: any, level: LogLevel}) {
    const {message, level} = opts;
    if (this.channel) {
      const currentTime = new Date();
      this.channel.appendLine(`[${currentTime}] [${level}] ${message}`);
    }
  }

  static log(message: any) {
    this._log({message, level: LogLevel.INFO});
  }

  static error(message: any) {
    this._log({message, level: LogLevel.ERROR});
  }

  static debug(message: any) {
    if (process.env.NODE_ENV === 'development') {
      this._log({message, level: LogLevel.DEBUG});
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