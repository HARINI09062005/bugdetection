from flask import Flask, render_template, request, jsonify, send_from_directory
import ast
import sys
from io import StringIO
import traceback
import os

app = Flask(__name__)

# Serve static files from the current directory
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# Serve index.html at the root
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# API endpoint for code analysis
@app.route('/api/analyze', methods=['POST'])
def analyze_code():
    try:
        code = request.json.get('code', '')
        
        # Use the client-side error detection results
        # but also check for more complex errors on the server side
        errors = []
        
        # Check for syntax errors
        try:
            ast.parse(code)
        except SyntaxError as e:
            errors.append({
                'type': 'Syntax Error',
                'line': e.lineno,
                'description': str(e)
            })
        
        return jsonify({
            'success': True,
            'errors': errors
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    app.run(debug=True, port=5501) 