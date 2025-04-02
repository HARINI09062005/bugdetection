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
    const errors = detectPythonErrors(code);
    updateBugDisplay(errors);
});

// Function to detect Python syntax errors
function detectPythonErrors(code) {
    const errors = [];
    
    // Basic syntax error detection
    const lines = code.split('\n');
    lines.forEach((line, index) => {
        
        // Check for common syntax errors
        if (line.trim().endsWith(':')) {
            const nextLine = lines[index + 1];
            if (nextLine && !nextLine.trim().startsWith('    ')) {
                errors.push({
                    type: 'Syntax Error',
                    line: index + 1,
                    description: 'Missing indentation after colon'
                });
            }
        }
        
        // Check for unclosed parentheses
        const openBrackets = (line.match(/[\(\[{]/g) || []).length;
        const closeBrackets = (line.match(/[\)\]}]/g) || []).length;
        if (openBrackets !== closeBrackets) {
            errors.push({
                type: 'Syntax Error',
                line: index + 1,
                description: 'Unmatched brackets'
            });
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
        bugContent.appendChild(bugMessage);
    });
} 