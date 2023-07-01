import * as vscode from 'vscode';

export async function storeUserSecrets(context: vscode.ExtensionContext, secretKey: string, secretValue: string) {
    return context.secrets.store(secretKey, secretValue);
}

export async function retrieveUserSecrets(context: vscode.ExtensionContext, secretKey: string) {
  const value = await context.secrets.get(secretKey);
  return value;
}
