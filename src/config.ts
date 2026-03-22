import * as vscode from 'vscode';

export interface PathCompleteConfig {
  triggerCharacter: string;
  ignoredPatterns: string[];
  maxResults: number;
  pathStyle: 'relative-to-workspace' | 'relative-to-file' | 'absolute';
  removeTriggerCharacter: boolean;
  showFileIcons: boolean;
  includeDirectories: boolean;
  respectGitignore: boolean;
}

export function loadConfig(): PathCompleteConfig {
  const cfg = vscode.workspace.getConfiguration('pathComplete');
  return {
    triggerCharacter: cfg.get<string>('triggerCharacter', '@'),
    ignoredPatterns: cfg.get<string[]>('ignoredPatterns', [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.DS_Store',
    ]),
    maxResults: cfg.get<number>('maxResults', 200),
    pathStyle: cfg.get<PathCompleteConfig['pathStyle']>('pathStyle', 'relative-to-workspace'),
    removeTriggerCharacter: cfg.get<boolean>('removeTriggerCharacter', true),
    showFileIcons: cfg.get<boolean>('showFileIcons', true),
    includeDirectories: cfg.get<boolean>('includeDirectories', false),
    respectGitignore: cfg.get<boolean>('respectGitignore', true),
  };
}
