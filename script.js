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
                // Transform server error to match client error format if needed
                const formattedServerError = {
                    line: serverError.line || 0,
                    error: serverError.error || serverError.description || '',
                    solution: serverError.solution || 'Review this code for potential issues.',
                    example_fix: serverError.example_fix || ''
                };
                
                // Check for duplicates
                const isDuplicate = allErrors.some(clientError => 
                    clientError.line === formattedServerError.line && 
                    (clientError.error === formattedServerError.error || 
                     clientError.description === formattedServerError.error)
                );
                
                if (!isDuplicate) {
                    allErrors.push(formattedServerError);
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
    let functions = new Map();
    let functionParams = new Set();
    let insideLoop = false;
    let insideFunction = false;

    const pythonKeywords = new Set([
        "if", "elif", "else", "for", "while", "def", "class", "try", "except", "finally", "return",
        "True", "False", "None", "and", "or", "not", "import", "print", "pass",
        "len", "range", "str", "int", "float", "list", "dict", "set", "tuple",
        "open", "input", "is", "in", "with", "as", "from", "break", "continue",
        "self", "super"
    ]);

    lines.forEach((line, index) => {
        let trimmed = line.trim();
        if (trimmed.startsWith('#')) return;

        const tripleQuoteMatch = trimmed.match(/^(['"]{3})/);
        if (tripleQuoteMatch) {
            inMultilineString = !inMultilineString;
            return;
        }
        if (inMultilineString) return;

        let codePart = trimmed.split('#')[0].trim();
        codePart = codePart.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, "");

        // Missing colon
        if (keywordsRequiringColon.test(codePart) && !codePart.endsWith(':')) {
            errors.push({
                line: index + 1,
                error: 'Missing colon at the end of statement',
                solution: 'Add a colon (:) at the end of this line.',
                example_fix: `${codePart}:\n    # Indented block`
            });
        }

        // Indentation Errors
        const leadingSpaces = line.match(/^\s*/)[0].length;
        if (indentStack.length > 0 && leadingSpaces < indentStack[indentStack.length - 1] && trimmed !== '') {
            errors.push({
                line: index + 1,
                error: 'Inconsistent indentation',
                solution: 'Ensure consistent indentation (usually multiples of 4 spaces).',
                example_fix: `def example():\n    print("Hello")  # Indented properly`
            });
        }
        if (codePart.endsWith(':')) {
            indentStack.push(leadingSpaces + 4);
        } else if (indentStack.length > 0 && leadingSpaces < indentStack[indentStack.length - 1]) {
            indentStack.pop();
        }

        // Unmatched brackets
        for (let char of codePart) {
            if ("({[".includes(char)) {
                bracketStack.push({ char, line: index + 1 });
            } else if (")}]".includes(char)) {
                const last = bracketStack.pop();
                if (!last || "({[".indexOf(last.char) !== ")}]".indexOf(char)) {
                    errors.push({
                        line: index + 1,
                        error: `Unmatched bracket: ${char}`,
                        solution: 'Ensure all opening brackets have a matching closing bracket.',
                        example_fix: `my_list = [1, 2, 3]  # Brackets properly matched`
                    });
                }
            }
        }

        // Undefined Variables
        const words = codePart.split(/[\s(),]+/);
        words.forEach(word => {
            if (/^[a-zA-Z_]\w*$/.test(word) &&
                !variables.has(word) &&
                !functions.has(word) &&
                !functionParams.has(word) &&
                !pythonKeywords.has(word)) {
                errors.push({
                    line: index + 1,
                    error: `Undefined variable: "${word}"`,
                    solution: `Define the variable "${word}" before using it.`,
                    example_fix: `${word} = 10  # Define before use`
                });
            }
        });

        // Division by Zero
        if (codePart.includes('/ 0') || codePart.includes('/0')) {
            errors.push({
                line: index + 1,
                error: 'Division by zero detected',
                solution: 'Ensure the denominator is never zero.',
                example_fix: `result = num / (denominator if denominator != 0 else 1)`
            });
        }

        // `break` or `continue` outside loop
        if (codePart === 'break' || codePart === 'continue') {
            if (!insideLoop) {
                errors.push({
                    line: index + 1,
                    error: `"${codePart}" used outside a loop`,
                    solution: 'Use "break" or "continue" only inside loops.',
                    example_fix: `for i in range(5):\n    if i == 3:\n        break  # Proper usage`
                });
            }
        }

        // `return` outside a function
        if (codePart.startsWith('return') && !insideFunction) {
            errors.push({
                line: index + 1,
                error: '`return` used outside a function',
                solution: 'Use "return" only inside function definitions.',
                example_fix: `def my_function():\n    return "Hello"`
            });
        }

        // Handle loop detection
        if (codePart.startsWith("for ") || codePart.startsWith("while ")) {
            insideLoop = true;
        }
        if (codePart === "") {
            insideLoop = false;
            insideFunction = false;
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
        // Determine error type based on error content
        let errorType = 'Syntax Error';
        if (error.error && error.error.includes('indentation')) {
            errorType = 'Indentation Error';
        } else if (error.error && (error.error.includes('variable') || error.error.includes('Function'))) {
            errorType = 'Name Error';
        } else if (error.error && error.error.includes('Division by zero')) {
            errorType = 'Runtime Error';
        }
        
        // Extract error details
        const errorMessage = error.error || error.description || '';
        const solution = error.solution || '';
        const exampleFix = error.example_fix || '';
        
        const bugMessage = document.createElement('div');
        bugMessage.className = 'bug-message';
        bugMessage.innerHTML = `
            <div class="bug-icon">🐛</div>
            <div class="bug-text">
                <p class="bug-title">${errorType}</p>
                <p class="bug-description">Line ${error.line}: ${errorMessage}</p>
                ${solution ? `<p class="bug-solution"><strong>Solution:</strong> ${solution}</p>` : ''}
                ${exampleFix ? `<p class="bug-example"><strong>Example:</strong> <code>${exampleFix}</code></p>` : ''}
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