import * as vscode from 'vscode';
import { loadConfig } from './config';
import { FileScanner } from './fileScanner';
import { PathCompletionProvider } from './completionProvider';

let scanner: FileScanner | undefined;
let providerDisposable: vscode.Disposable | undefined;

function registerProvider(
  context: vscode.ExtensionContext,
  scanner: FileScanner,
  provider: PathCompletionProvider,
  triggerCharacter: string,
): vscode.Disposable {
  const selectors: vscode.DocumentSelector = [
    { scheme: 'file', language: '*' },
    { scheme: 'untitled', language: '*' },
  ];

  return vscode.languages.registerCompletionItemProvider(
    selectors,
    provider,
    triggerCharacter,
  );
}

export function activate(context: vscode.ExtensionContext): void {
  let config = loadConfig();
  scanner = new FileScanner(config);
  const provider = new PathCompletionProvider(scanner, config);

  providerDisposable = registerProvider(context, scanner, provider, config.triggerCharacter);
  context.subscriptions.push(providerDisposable);
  context.subscriptions.push(scanner);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (!e.affectsConfiguration('pathComplete')) return;

      const newConfig = loadConfig();
      const triggerChanged = newConfig.triggerCharacter !== config.triggerCharacter;

      config = newConfig;
      scanner!.updateConfig(config);
      provider.updateConfig(config);

      // Re-register provider if trigger character changed
      if (triggerChanged && providerDisposable) {
        providerDisposable.dispose();
        providerDisposable = registerProvider(context, scanner!, provider, config.triggerCharacter);
        context.subscriptions.push(providerDisposable);
      }
    }),
  );
}

export function deactivate(): void {}
