import vscode from 'vscode';
import { Config, CONSTANTS } from '../constants';
import { IConfig } from '../types';

export function getConfig(): IConfig {
  const config = vscode.workspace.getConfiguration(CONSTANTS.EXTENSION_NAMESPACE);
  // iterate over the enum Config and get the value of each key

  // TODO: zod validation
  const configValues: any = {};
  for (const key in Config) {
    configValues[key] = config.get(key);
  }
  return configValues as IConfig;
}
