const vscode = acquireVsCodeApi();
const testCasesContainer = document.getElementById('testCasesContainer');
const addTestCaseBtn = document.getElementById('addTestCaseBtn');
const runAllBtn = document.getElementById('runAllBtn');
const loadTestcasesBtn = document.getElementById('loadTestcasesBtn');
const problemIdInput = document.getElementById('problemIdInput');

let currentIndex = 0;

function createTestCase(index = currentIndex++, test = null) 
{
  const wrapper = document.createElement('div');
  wrapper.className = 'test-case';
  wrapper.dataset.index = index;

  const title = document.createElement('h3');
  title.textContent = `Test Case ${index + 1}`;

  const inputLabel = document.createElement('label');
  inputLabel.textContent = 'Input';
  const inputBox = document.createElement('textarea');
  inputBox.className = 'input-box';
  if (test?.input) {inputBox.value = test.input;}

  const expectedLabel = document.createElement('label');
  expectedLabel.textContent = 'Expected Output';
  const expectedBox = document.createElement('textarea');
  expectedBox.className = 'expected-box';
  if (test?.output) {expectedBox.value = test.output;}

  const outputLabel = document.createElement('label');
  outputLabel.textContent = 'Your Output';
  const outputBox = document.createElement('textarea');
  outputBox.className = 'output-box';
  outputBox.readOnly = true;

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Submit';
  submitBtn.onclick = () => 
  {
    vscode.postMessage({ command: 'runsingle', input: inputBox.value, index });
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-btn';
  deleteBtn.onclick = () => 
  {
    vscode.postMessage({ command: 'deletetestfile', index });
    wrapper.remove();
  };

  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group';
  btnGroup.append(submitBtn, deleteBtn);

  wrapper.append(title, inputLabel, inputBox, expectedLabel, expectedBox, outputLabel, outputBox, btnGroup);
  testCasesContainer.appendChild(wrapper);

  vscode.postMessage({ command: 'createtestfile', index });
}

// adding new blank testcase
addTestCaseBtn.onclick = () => createTestCase();

runAllBtn.onclick = () => 
{
  const testCases = Array.from(document.querySelectorAll('.test-case')).map(wrapper => ({
    index: parseInt(wrapper.dataset.index), // reads data-index from DOM
    input: wrapper.querySelector('.input-box').value
  }));
  vscode.postMessage({ command: 'runall', testCases });
};

loadTestcasesBtn.onclick = () => 
{
  const val = problemIdInput.value.trim().toUpperCase();
  if (!val || !/^\d+[A-Z]+$/.test(val)) 
  {
    alert('Enter Problem ID');
    return;
  }

  // split "1922A" → contestId="1922", problemIndex="A"
  const m = val.match(/^(\d+)([A-Z]+)$/);
  if (!m) 
  {
    alert('Invalid format. Use something like 1922A');
    return;
  }
  const contestId = m[1];
  const problemIndex = m[2];
  vscode.postMessage({
    command: 'loadtestcases',
    contestId: contestId,
    problemIndex: problemIndex
  });
};

window.addEventListener('message', event => 
{
  const { command, index, output, testcases } = event.data;

  if (command === 'showoutput') 
  {
    const block = document.querySelector(`.test-case[data-index="${index}"]`);
    if (!block) {return;}
    const outBox = block.querySelector('.output-box');
    outBox.value = output;

    const exp = block.querySelector('.expected-box').value.trim();
    const act = outBox.value.trim();
    block.style.backgroundColor = (exp === act) ? '#004400' : '#440000';
  }
  if (command === 'loadsampletests' && Array.isArray(testcases)) 
  {
    testcases.forEach((test) =>
    {
      createTestCase(currentIndex, { input: test.input, output: test.output});
      currentIndex++;
    });
  }
});
createTestCase();
