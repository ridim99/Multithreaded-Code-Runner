import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';

function getCurrentTimeString(): string 
{
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}${mm}${ss}`;
}
function extractIndex(filename: string): number | null {
  const match = filename.match(/^out_(\d+)\.json$/);
  return match ? parseInt(match[1], 10) : null;
}
function generateUniqueJobFileName(): string 
{
  const timeStr = getCurrentTimeString();
  const randomNum = Math.floor(Math.random() * 1000);  // optional randomness to avoid collisions
  return `job_${timeStr}_${randomNum}.json`;
}
function spawnAsync(command: string, args: string[], cwd: string): Promise<number> 
{
  return new Promise((resolve, reject) => 
  {
    const child = cp.spawn(command, args, { cwd, shell: true });
    child.stdout.on('data', (data) => console.log('stdout:', data.toString()));
    child.stderr.on('data', (data) => console.error('stderr:', data.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? -1));
  });
}

export class sidebar implements vscode.WebviewViewProvider 
{
  private jobFolder: string | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) 
  {
    const webview = webviewView.webview;
    webview.options = 
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
    };

    const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'sidebar.html');
    vscode.workspace.fs.readFile(htmlPath).then(fileData => {
      let html = fileData.toString();
      html = html.replace(
        '${scriptUri}',
        webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'sidebar.js')).toString()
      );
      html = html.replace(
        '${styleUri}',
        webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'sidebar.css')).toString()
      );
      webview.html = html;
    });

    webview.onDidReceiveMessage(async (message) => 
    {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'cpp') 
      {
        webview.postMessage({ command: 'showoutput', index: message.index ?? -1, output: 'C++ editor open.' });
        return;
      }

      const folder = path.dirname(editor.document.fileName);
      this.jobFolder = path.join(folder, 'job_queue');
      await fs.promises.mkdir(this.jobFolder, { recursive: true });

      if (message.command === 'createtestfile') 
      {
        const testPath = path.join(folder, `test_${message.index}.json`);
        const outPath = path.join(folder, `out_${message.index}.json`);
        try 
        {
          await fs.promises.writeFile(testPath, JSON.stringify({ input: '', expected: '' }, null, 2), 'utf-8');
          await new Promise((res) => setTimeout(res, 50));
          await fs.promises.writeFile(outPath, JSON.stringify({ output: '' }, null, 2), 'utf-8');
        } catch (err) 
        {
          console.error('output file writing error ', err);
        }
      }

      if (message.command === 'deletetestfile') 
      {
        const testPath = path.join(folder, `test_${message.index}.json`);
        const outPath = path.join(folder, `out_${message.index}.json`);
        try { await fs.promises.unlink(testPath); } catch (e) { console.warn(`⚠️ Failed to delete ${testPath}:`, e); }
        try { await fs.promises.unlink(outPath); } catch (e) { console.warn(`⚠️ Failed to delete ${outPath}:`, e); }
      }

      if (message.command === 'runsingle') 
      {
        // console.log(message.index);
        const editor = vscode.window.activeTextEditor;
        if (editor) 
        {
          editor.document.save().then(() => 
          {
            console.log('File saved successfully');
          }, (err) => {
            console.error('Failed to save file:', err);
          });
        }
        console.log("YES\n");
        if(editor)
        {
          const filePath = editor.document.fileName; // Full path to current file
          const filename = path.basename(filePath);  // Just the file name (e.g. temp.cpp)
          const folderPath = path.dirname(filePath); // Folder where the file is located
          const exePath = path.join(folderPath, 'filecompiler.exe'); 
          const cwd = path.dirname(editor.document.fileName);
          try 
          {
            const exitCode = await spawnAsync(exePath, [filename], cwd);
            console.log(`file runner ${exitCode}`);
          } 
          catch (err) 
          {
            console.error('cant compile file', err);
          }
        }
        // console.log(filename);
        const inputPath = path.join(folder, `test_${message.index}.json`);
        const outputPath = path.join(folder, `out_${message.index}.json`);
        const jobFilePath = path.join(this.jobFolder, generateUniqueJobFileName());
        console.log(jobFilePath);
        const testData = { input: message.input, expected: '' };

        try 
        {
          await fs.promises.writeFile(inputPath, JSON.stringify(testData, null, 2), 'utf-8');
          await new Promise(res => setTimeout(res, 500));
          const tmpJobFilePath = jobFilePath + '.tmp';
          const jobData = { inputPath, outputPath };
          await fs.promises.writeFile(tmpJobFilePath, JSON.stringify(jobData, null, 2), 'utf-8');
          await fs.promises.rename(tmpJobFilePath, jobFilePath);
        } 
        catch (err) 
        {
          console.error(`cant write job file`, err);
        }

        const maxWaitMs = 10000;
        const pollIntervalMs = 100;
        let waited = 0;
        const stats = fs.statSync(inputPath);
        const prevtime = stats.mtime;
        let output = "Time Limit exceded";
        while(waited<=maxWaitMs)
        {
          waited+=pollIntervalMs;
          const stats = fs.statSync(outputPath);
          const modifiedTime = stats.mtime;
          if(modifiedTime>prevtime)
          {
            const outRaw = await fs.promises.readFile(outputPath, 'utf-8');
            const outJson = JSON.parse(outRaw);
            output = outJson.output;
            break;
          }
          await new Promise(res => setTimeout(res, pollIntervalMs));
        }
        webview.postMessage({ command: 'showoutput', index: message.index, output });
      }


      if (message.command === 'runall')
      {
        const editor = vscode.window.activeTextEditor;
        if (!editor) 
        {
          return;
        }
        console.log("runallcommand");
        await editor.document.save();
        const filePath = editor.document.fileName;
        const filename = path.basename(filePath);
        const folderPath = path.dirname(filePath);
        const exePath = path.join(folderPath, 'filecompiler.exe');
        const cwd = path.dirname(editor.document.fileName);
        try 
        {
          const exitCode = await spawnAsync(exePath, [filename], folderPath);
          console.log("exited with code", `${exitCode}`);
        } 
        catch (err) 
        {
          console.error('cant compile :', err);
          // return;
        }
        
        // use test cases fron frontend
        const testCases: Array<{ index: number,input: string }> = message.testCases;
        console.log(testCases[0]);
        const update = new Map<string,Date>(); 
        // console.log(folderPath);
        for (let i=0; i<testCases.length; i++) 
          {
            const inputPath = path.join(folderPath, `test_${testCases[i].index}.json`);
            const outputPath = path.join(folderPath, `out_${testCases[i].index}.json`);
            const jobFilePath = path.join(this.jobFolder, generateUniqueJobFileName());
            const testData = { input: testCases[i].input, expected: '' };
            console.log(testData);
            try 
            {
              await fs.promises.writeFile(inputPath, JSON.stringify(testData, null, 2), 'utf-8');
              await new Promise(res => setTimeout(res, 50));
              // const outputPath = path.join(__dirname,`src`,`out_${testCases[i].index}.json`);
              // console.log(outputPath);
              // console.log(this.jobFolder);
              
              const stats = fs.statSync(inputPath);
              const modifiedTime = stats.mtime;
              update.set(`out_${testCases[i].index}.json`, modifiedTime);
              // console.log("ridim ", modifiedTime);
              const tmpJobPath = jobFilePath + '.tmp';
              const jobData = { inputPath, outputPath };
              await fs.promises.writeFile(tmpJobPath, JSON.stringify(jobData, null, 2), 'utf-8');
              await fs.promises.rename(tmpJobPath, jobFilePath);
          } 
          catch (err) 
          {
            console.error(` Error writing job file for test ${testCases[i].index}:`, err);
            continue;
          }
        }
        const maxWaitMs = 10000;
        const pollIntervalMs = 200;
        let waited = 0;
        while(waited<=maxWaitMs && testCases.length>0)
        {
          waited+=pollIntervalMs;
          for(let i = testCases.length-1; i>=0; i--)
          {
            const outputPath = path.join(folderPath, `out_${testCases[i].index}.json`);
            const index = testCases[i].index;
            const stats = fs.statSync(outputPath);
            const modifiedTime = stats.mtime;
            const key = `out_${index}.json`;
            // console.log(modifiedTime);
            const prevtime = update.get(key) ?? new Date(0);
            // console.log(prevtime);
            // console.log(prevtime<modifiedTime);
            if (prevtime< modifiedTime) 
            {
              console.log("YES\n");
              const outRaw = await fs.promises.readFile(outputPath, 'utf-8');
              const outJson = JSON.parse(outRaw);
              webview.postMessage({ command: 'showoutput', index: index,output: outJson.output });
              testCases.splice(i,1);
            }
          }
          // console.log("YES\n");
          await new Promise(res => setTimeout(res, pollIntervalMs));
        }
        for(let i= 0; i<testCases.length; i++)
        {
          webview.postMessage({command: 'showoutput',index: testCases[i].index,output: 'Time limit excedeed'});
        }
      }
      
      if (message.command === 'loadtestcases') 
      {
        console.log("YES\n");
        const { contestId, problemIndex } = message as { contestId: string; problemIndex: string; };
        const scraperPath = vscode.Uri.joinPath(
          this.context.extensionUri,'src',
          'testscraper.py'
        ).fsPath;
        // console.log(scraperPath);
        const pythonProcess = cp.spawn('python3.11', [scraperPath, contestId, problemIndex]);
        let stdoutData = '';
        let stderrData = '';

        // 3) Capture everything Python writes to stdout
        pythonProcess.stdout.on('data', (chunk) => 
        {
          stdoutData += chunk.toString();
        });
        
        pythonProcess.stderr.on('data', (chunk) => 
        {
          stderrData += chunk.toString();
        });
        
        pythonProcess.on('close', (code) =>
        {
          if (code !== 0) 
          {
            vscode.window.showErrorMessage(
              `testscraper.py exited with code ${code}: ${stderrData}`
            );
            return;
          }
          try 
          {
            const cases = JSON.parse(stdoutData) as Array<{ input: string; output: string }>;
            // console.log('Parsed test cases:', JSON.stringify(cases, null, 2));
            if (!Array.isArray(cases)) 
            {
              vscode.window.showErrorMessage('cant load testcases do manually');
              return;
            }
            webview.postMessage({ command: 'loadsampletests', testcases: cases });
          } 
          catch (err: any) 
          {
            vscode.window.showErrorMessage(`Failed to load testcases: ${err.message ?? err}`);
          }
        });
      }
    });
  }
}