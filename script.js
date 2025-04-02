// Initialize CodeMirror editor
const editor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
    mode: "python",
    theme: "monokai",
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    lineWrapping: true,
    extraKeys: {
        "Tab": "indentMore",
        "Shift-Tab": "indentLess"
    }
});

// Set initial editor size
editor.setSize("100%", "100%");

// Set empty initial value
editor.setValue("");

// Get elements
const editorContainer = document.querySelector('.editor-container');
const analyzeBtn = document.getElementById('analyze-btn');

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.checked = true;
}

themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
});

// File upload functionality
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInputBtn = document.getElementById('file-input-btn');

// Handle file input button click
fileInputBtn.addEventListener('click', () => {
    fileInput.click();
});

// Handle file selection
fileInput.addEventListener('change', handleFileSelect);

// Handle drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary-color)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (file.name.endsWith('.py')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            editor.setValue(e.target.result);
            editorContainer.classList.add('has-content');
            analyzeBtn.disabled = false;
            analyzeBtn.classList.add('active');
        };
        reader.readAsText(file);
    } else {
        alert('Please upload a Python file (.py)');
    }
}

// Bug section toggle functionality
const toggleBtn = document.getElementById('toggle-results');
const bugSection = document.querySelector('.bug-section');
const bugHeader = document.querySelector('.bug-header');
const bugContent = document.querySelector('.bug-content');

// Initialize in collapsed state
bugSection.classList.remove('expanded');
bugSection.classList.add('collapsed');
updateToggleIcon();

// Only add click event to the toggle button, not the header
toggleBtn.addEventListener('click', toggleBugSection);

function toggleBugSection(e) {
    // Stop event propagation to prevent any parent elements from receiving the click
    e.stopPropagation();
    
    bugSection.classList.toggle('expanded');
    bugSection.classList.toggle('collapsed');
    updateToggleIcon();
}

function updateToggleIcon() {
    const icon = toggleBtn.querySelector('i');
    if (bugSection.classList.contains('collapsed')) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// Analyze button functionality
analyzeBtn.addEventListener('click', () => {
    const code = editor.getValue();
    
    // First perform client-side error detection
    const clientErrors = detectPythonErrors(code);
    
    // Then check for additional errors from the server
    fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Combine client and server errors, removing duplicates
            const serverErrors = data.errors || [];
            const allErrors = [...clientErrors];
            
            // Add server errors that don't already exist in client errors
            serverErrors.forEach(serverError => {
                const isDuplicate = allErrors.some(clientError => 
                    clientError.line === serverError.line && 
                    clientError.description === serverError.description
                );
                
                if (!isDuplicate) {
                    allErrors.push(serverError);
                }
            });
            
            // Sort errors by line number
            allErrors.sort((a, b) => a.line - b.line);
            
            // Update the UI with all errors
            updateBugDisplay(allErrors);
        } else {
            // If server fails, just show client-side errors
            updateBugDisplay(clientErrors);
            console.error('Server error:', data.error);
        }
    })
    .catch(error => {
        // If fetch fails, just use client-side errors
        updateBugDisplay(clientErrors);
        console.error('Network error:', error);
    });
});

// Function to detect Python syntax errors (client-side)
function detectPythonErrors(code) {
    const errors = [];
    const lines = code.split('\n');
    const bracketStack = [];
    const indentStack = [];
    const keywordsRequiringColon = /^(if|elif|else|for|while|def|class|try|except|finally)\b/;

    let inMultilineString = false;
    let variables = new Set();
    let functions = new Map(); // function_name -> expected_param_count
    let functionParams = new Set(); // Track function parameters
    let usedVariables = new Set();

    // ✅ List of Python built-in keywords and functions to ignore
    const pythonKeywords = new Set([
        "if", "elif", "else", "for", "while", "def", "class", "try", "except", "finally", "return",
        "True", "False", "None", "and", "or", "not", "import", "print", "pass",
        "len", "range", "str", "int", "float", "list", "dict", "set", "tuple",
        "open", "input", "is", "in", "with", "as", "from", "break", "continue"
    ]);

    lines.forEach((line, index) => {
        let trimmed = line.trim();
        if (trimmed.startsWith('#')) return; // Ignore comments

        // ✅ Handle multi-line strings (''' or """)
        const tripleQuoteMatch = trimmed.match(/^(['"]{3})/);
        if (tripleQuoteMatch) {
            inMultilineString = !inMultilineString;
            return;
        }
        if (inMultilineString) return;

        let codePart = trimmed.split('#')[0].trim(); // Remove inline comments

        // ✅ Ignore strings inside quotes to prevent misidentifying them as variables
        codePart = codePart.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, "");

        // 1️⃣ Check for missing colon in statements that require it
        if (keywordsRequiringColon.test(codePart) && !codePart.endsWith(':')) {
            errors.push({ type: 'Syntax Error', line: index + 1, description: 'Missing colon at the end of statement' });
        }

        // 2️⃣ Check indentation consistency
        const leadingSpaces = line.match(/^\s*/)[0].length;
        if (indentStack.length > 0 && leadingSpaces < indentStack[indentStack.length - 1] && trimmed !== '') {
            errors.push({ type: 'Indentation Error', line: index + 1, description: 'Inconsistent indentation' });
        }
        if (codePart.endsWith(':')) {
            indentStack.push(leadingSpaces + 4);
        } else if (indentStack.length > 0 && leadingSpaces < indentStack[indentStack.length - 1]) {
            indentStack.pop();
        }

        // 3️⃣ Unexpected Indentation (only when outside of a function/class block)
        if (leadingSpaces > 0 && indentStack.length === 0 && !trimmed.startsWith("def ") && !trimmed.startsWith("class ")) {
            errors.push({ type: 'Indentation Error', line: index + 1, description: 'Unexpected indentation' });
        }

        // 4️⃣ Check for unmatched brackets
        for (let char of codePart) {
            if ("({[".includes(char)) {
                bracketStack.push({ char, line: index + 1 });
            } else if (")}]".includes(char)) {
                const last = bracketStack.pop();
                if (!last || "({[".indexOf(last.char) !== ")}]".indexOf(char)) {
                    errors.push({ type: 'Syntax Error', line: index + 1, description: `Unmatched bracket: ${char}` });
                }
            }
        }

        // 5️⃣ Unmatched Quotes
        const singleQuotes = (codePart.match(/'/g) || []).length;
        const doubleQuotes = (codePart.match(/"/g) || []).length;
        if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
            errors.push({ type: 'Syntax Error', line: index + 1, description: 'Unmatched quotation marks' });
        }

        // 6️⃣ Detect Function Definitions & Parameters
        const funcDefMatch = codePart.match(/^def\s+([a-zA-Z_]\w*)\(([^)]*)\)/);
        if (funcDefMatch) {
            let funcName = funcDefMatch[1];
            let paramList = funcDefMatch[2].split(',').map(p => p.trim()).filter(p => p !== '');
            let paramCount = paramList.length;

            // ✅ Track function parameters to prevent them from being marked as undefined
            paramList.forEach(param => functionParams.add(param));

            if (functions.has(funcName)) {
                errors.push({ type: 'Warning', line: index + 1, description: `Function "${funcName}" is redefined` });
            }
            functions.set(funcName, paramCount);
        }

        // 7️⃣ Detect Function Calls
        const funcCallMatch = codePart.match(/([a-zA-Z_]\w*)\(([^)]*)\)/);
        if (funcCallMatch) {
            let funcName = funcCallMatch[1];
            let passedArgsCount = funcCallMatch[2].split(',').filter(p => p.trim() !== '').length;
            if (functions.has(funcName) && functions.get(funcName) !== passedArgsCount) {
                errors.push({ type: 'Type Error', line: index + 1, description: `Incorrect number of arguments in function "${funcName}"` });
            }
        }

        // 8️⃣ Detect Variable Assignments
        const varMatch = codePart.match(/^([a-zA-Z_]\w*)\s*=/);
        if (varMatch) {
            let varName = varMatch[1];
            variables.add(varName);
        }

        // 9️⃣ Detect Undefined Variables (ignoring Python keywords, functions, and parameters)
        const words = codePart.split(/[\s(),]+/);
        words.forEach(word => {
            if (/^[a-zA-Z_]\w*$/.test(word) &&
                !variables.has(word) &&  // Not already assigned
                !functions.has(word) &&  // Not a function
                !functionParams.has(word) &&  // Not a function parameter
                !pythonKeywords.has(word) &&
                !codePart.includes(`${word} =`)) {  // ✅ Ignore variables being assigned
            errors.push({ type: 'Name Error', line: index + 1, description: `Undefined variable: "${word}"` });
    }
});

        // 🔟 Prevent False `return` Outside Function Errors
        if (codePart.startsWith('return') && indentStack.length === 0 && functionParams.size === 0) {
            errors.push({ type: 'Syntax Error', line: index + 1, description: '`return` statement outside function' });
        }
    });

    return errors;
}





// Function to update bug display
function updateBugDisplay(errors) {
    const bugContent = document.querySelector('.bug-content');
    bugContent.innerHTML = '';
    
    if (errors.length === 0) {
        bugContent.innerHTML = `
            <div class="bug-message">
                <div class="bug-icon">✅</div>
                <div class="bug-text">
                    <p class="bug-title">No Errors Found</p>
                    <p class="bug-description">Your code looks good!</p>
                </div>
            </div>
        `;
        return;
    }
    
    errors.forEach(error => {
        const bugMessage = document.createElement('div');
        bugMessage.className = 'bug-message';
        bugMessage.innerHTML = `
            <div class="bug-icon">🐛</div>
            <div class="bug-text">
                <p class="bug-title">${error.type}</p>
                <p class="bug-description">Line ${error.line}: ${error.description}</p>
            </div>
        `;
        
        // Add click event to highlight the line in editor
        if (error.line > 0) {
            bugMessage.addEventListener('click', () => {
                editor.setCursor(error.line - 1, 0);
                editor.focus();
            });
            bugMessage.style.cursor = 'pointer';
        }
        
        bugContent.appendChild(bugMessage);
    });
} 