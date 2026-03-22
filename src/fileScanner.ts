import * as vscode from 'vscode';
import { PathCompleteConfig } from './config';

export class FileScanner implements vscode.Disposable {
  private cache: vscode.Uri[] | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(private config: PathCompleteConfig) {
    const invalidate = () => this.scheduleInvalidate();

    this.disposables.push(
      vscode.workspace.onDidCreateFiles(invalidate),
      vscode.workspace.onDidDeleteFiles(invalidate),
      vscode.workspace.onDidRenameFiles(invalidate),
    );
  }

  updateConfig(config: PathCompleteConfig): void {
    this.config = config;
    this.invalidate();
  }

  async scan(token: vscode.CancellationToken): Promise<vscode.Uri[]> {
    if (this.cache) {
      return this.cache;
    }

    const excludePattern = this.buildExcludePattern();
    const files = await vscode.workspace.findFiles(
      '**/*',
      excludePattern,
      this.config.maxResults,
      token,
    );

    if (!token.isCancellationRequested) {
      this.cache = files;
    }

    return files;
  }

  getDirectories(files: vscode.Uri[]): string[] {
    const dirs = new Set<string>();
    for (const file of files) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
      if (!workspaceFolder) continue;

      const relativePath = vscode.workspace.asRelativePath(file, false);
      const parts = relativePath.split('/');
      // Build all parent directory paths
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    }
    return Array.from(dirs).sort();
  }

  invalidate(): void {
    this.cache = null;
  }

  private scheduleInvalidate(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.invalidate();
      this.refreshTimer = null;
    }, 300);
  }

  private buildExcludePattern(): string {
    const patterns = this.config.ignoredPatterns;
    if (patterns.length === 0) return '';
    if (patterns.length === 1) return patterns[0];
    return `{${patterns.join(',')}}`;
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.disposables.forEach(d => d.dispose());
  }
}
