import * as vscode from 'vscode';
// singleton. DO NOT ADD EXTRA DEPENDENCIES TO THIS


// eslint-disable-next-line prefer-const
let CONTEXT_SINGLETON: null|vscode.ExtensionContext = null;

export const createExtensionContextProvider = (context: vscode.ExtensionContext) => {
  if (CONTEXT_SINGLETON === null) {
    CONTEXT_SINGLETON = context;
  }
};

export const getExtensionContext = () => {
  if (CONTEXT_SINGLETON === null) {
    throw new Error('Extension context not initialized');
  }
  return CONTEXT_SINGLETON;
};