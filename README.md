# Python Bug Detector

A web application that helps detect bugs and syntax errors in Python code.

## Features

- Syntax error detection
- Runtime error detection
- Common logical error detection
- Line highlighting for errors
- Light/Dark theme toggle

## Setup and Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd python-bug-detector
   ```

2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

3. Run the Flask application:
   ```
   python app.py
   ```

4. Open your browser and go to:
   ```
   http://127.0.0.1:5501
   ```

## How to Use

1. Upload a Python file or paste your code into the editor
2. Click the "Analyze Code" button
3. View the detected errors in the bug detection results section
4. Click on an error to highlight the corresponding line in the editor

## Technology Stack

- Flask (Backend)
- JavaScript (Frontend)
- CodeMirror (Code Editor)
- HTML/CSS

## License

MIT 