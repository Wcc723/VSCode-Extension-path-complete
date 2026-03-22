import * as vscode from 'vscode';
import * as path from 'path';
import { PathCompleteConfig } from './config';
import { FileScanner } from './fileScanner';

export class PathCompletionProvider implements vscode.CompletionItemProvider {
  constructor(
    private scanner: FileScanner,
    private config: PathCompleteConfig,
  ) {}

  updateConfig(config: PathCompleteConfig): void {
    this.config = config;
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[] | undefined> {
    // Find the trigger character position
    const triggerPos = this.findTriggerPosition(document, position);
    if (triggerPos === null) return undefined;

    // Get the partial text typed after the trigger character
    const partialRange = new vscode.Range(
      position.line,
      triggerPos + 1,
      position.line,
      position.character,
    );
    const partial = document.getText(partialRange);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    const files = await this.scanner.scan(token);
    if (token.isCancellationRequested) return undefined;

    const items: vscode.CompletionItem[] = [];

    // The range to replace: from trigger char (or after it) to cursor
    const replaceStart = this.config.removeTriggerCharacter ? triggerPos : triggerPos + 1;
    const replaceRange = new vscode.Range(
      position.line,
      replaceStart,
      position.line,
      position.character,
    );

    // Add file completions
    for (const file of files) {
      const insertPath = this.resolveInsertPath(file, document);
      if (insertPath === null) continue;

      const item = new vscode.CompletionItem(
        vscode.workspace.asRelativePath(file, false),
        this.config.showFileIcons
          ? vscode.CompletionItemKind.File
          : vscode.CompletionItemKind.Text,
      );
      item.insertText = insertPath;
      item.filterText = this.config.triggerCharacter + vscode.workspace.asRelativePath(file, false);
      item.range = replaceRange;
      item.detail = vscode.workspace.asRelativePath(file, true);
      item.sortText = vscode.workspace.asRelativePath(file, false);
      items.push(item);
    }

    // Add directory completions
    if (this.config.includeDirectories) {
      const dirs = this.scanner.getDirectories(files);
      for (const dir of dirs) {
        const item = new vscode.CompletionItem(
          dir,
          this.config.showFileIcons
            ? vscode.CompletionItemKind.Folder
            : vscode.CompletionItemKind.Text,
        );
        item.insertText = dir;
        item.filterText = this.config.triggerCharacter + dir;
        item.range = replaceRange;
        item.sortText = dir;
        items.push(item);
      }
    }

    return items;
  }

  private findTriggerPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): number | null {
    const lineText = document.lineAt(position.line).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Search backwards for the trigger character
    const triggerIdx = textBeforeCursor.lastIndexOf(this.config.triggerCharacter);
    if (triggerIdx === -1) return null;

    return triggerIdx;
  }

  private resolveInsertPath(
    fileUri: vscode.Uri,
    document: vscode.TextDocument,
  ): string | null {
    switch (this.config.pathStyle) {
      case 'relative-to-workspace':
        return vscode.workspace.asRelativePath(fileUri, false);

      case 'relative-to-file': {
        // For untitled files, fall back to workspace-relative
        if (document.isUntitled) {
          return vscode.workspace.asRelativePath(fileUri, false);
        }
        const docDir = path.dirname(document.uri.fsPath);
        const rel = path.relative(docDir, fileUri.fsPath);
        // Use forward slashes
        return rel.split(path.sep).join('/');
      }

      case 'absolute':
        return fileUri.fsPath;

      default:
        return vscode.workspace.asRelativePath(fileUri, false);
    }
  }
}
