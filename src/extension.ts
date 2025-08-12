import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { sidebar } from './sidebar';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) 
{
  console.log('Congratulations, your extension "concurrent coderunner" is now active');
  const disposable = vscode.commands.registerCommand('RunCode', () => 
  {
	  vscode.window.showInformationMessage('it started');
	});
context.subscriptions.push(vscode.window.registerWebviewViewProvider('work_side_bar', new sidebar(context)));
context.subscriptions.push(disposable);
const editor = vscode.window.activeTextEditor;
if (!editor) 
{
  return;
}
const filepath = editor.document.fileName;
const filename = path.basename(filepath, '.cpp') + '.exe';
const jobrunnerPath = context.asAbsolutePath(path.join('bin', 'jobrunner.exe'));
console.log(filename);
const jobrunnerproc = cp.spawn(jobrunnerPath, [filename, 'job_queue'], 
  {
	cwd: path.dirname(jobrunnerPath),
	shell: true 
  });
  // when the extension is closed kill the process
  context.subscriptions.push({
    dispose() {
      if (jobrunnerproc) {
        jobrunnerproc.kill();
      }
    }
  });
}
export function deactivate()
{

};
