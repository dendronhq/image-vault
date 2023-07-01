import * as vscode from 'vscode';
import { Logger } from './utils/logger';

export const createImageHoverProvider = vscode.languages.registerHoverProvider(
  { scheme: 'file', language: 'markdown' },
  {
    provideHover(document: vscode.TextDocument, position: vscode.Position) {
      const wordRange = document.getWordRangeAtPosition(position, /(?:https?|ftp):\/\/[\w/\-?=%.]+\.[\w/\-?=%.]+/);
      const word = document.getText(wordRange);


      Logger.debug(`Hovering over ${word}`);
      if (isValidImageUrl(word)) {
        const imageSize= '300px'; // Set the maximum width for the image
        const htmlString = `<img src="${word}" width="${imageSize}" height="${imageSize}">`;
        const markdownString = new vscode.MarkdownString(htmlString);
        markdownString.supportHtml = true;
        markdownString.isTrusted = true;
        Logger.debug(`Hovering over ${word} with ${htmlString}`);
        return new vscode.Hover(markdownString);
      }

      return null;
    },
  }
);

function isValidImageUrl(url: string): boolean {
  // TODO: impement
  return true;
}
