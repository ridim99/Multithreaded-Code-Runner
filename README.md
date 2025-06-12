# Multithreaded Code Runner README

This is the README for your extension "Multithreaded code-runner". After writing up a brief description, we recommend including the following sections.

## Features

🧵 Multithreaded Execution
Executes multiple test files in parallel using multithreading.
Significantly reduces the total runtime for large sets of testcases.
Ideal for competitive programming where time efficiency is critical.

🔗 Codeforces Integration
Fetches testcases automatically from Codeforces for a given problem.
Supports both problem URLs and problem codes (e.g., 1900A, 1899C, etc.).
Eliminates the need for manual copy-pasting of input/output data.

🧪 Automated Output Matching
Runs your solution against all testcases and compares output.
Clearly highlights pass/fail status for each testcase.
Shows detailed diff if your output doesn't match the expected output.

🖥️ Language and File Support
Supports compiled languages like C++ and interpreted scripts like Python.
Accepts standard input/output files (inputX.txt, outputX.txt) and custom formats.
Supports .exe execution for precompiled solutions.

📦 Clean Architecture
Modular structure with separate components for:
Testcase fetching
Multithreaded execution
Output comparison

## Requirements

To run this project locally in VS Code:

Place the code file you're working on inside the src/ directory.
(For example, the default file used is my_file.cpp.)

To enable Codeforces testcase fetching, open src/sidebar.ts and set your installed Python version (e.g., "python3.11" or "python" depending on your system setup).

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.


## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
