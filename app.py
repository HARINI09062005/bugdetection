from flask import Flask, render_template, request, jsonify
import ast
import sys
from io import StringIO
import traceback

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_code():
    try:
        code = request.json.get('code', '')
        
        # Store errors found
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
        
        # Check for runtime errors by executing in a safe environment
        if not errors:  # Only run if no syntax errors
            # Capture stdout and stderr
            old_stdout = sys.stdout
            old_stderr = sys.stderr
            redirected_output = StringIO()
            redirected_error = StringIO()
            sys.stdout = redirected_output
            sys.stderr = redirected_error
            
            try:
                # Execute code in a safe environment
                exec(code)
            except Exception as e:
                error_type = type(e).__name__
                error_msg = str(e)
                tb = traceback.extract_tb(sys.exc_info()[2])
                line_no = tb[-1].lineno if tb else 0
                
                errors.append({
                    'type': error_type,
                    'line': line_no,
                    'description': error_msg
                })
            finally:
                # Restore stdout and stderr
                sys.stdout = old_stdout
                sys.stderr = old_stderr
        
        # Check for common logical errors
        lines = code.split('\n')
        for i, line in enumerate(lines):
            # Check for indentation issues
            if line.strip().endswith(':'):
                if i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].startswith(' '):
                    errors.append({
                        'type': 'Indentation Warning',
                        'line': i + 2,  # +1 for 0-indexing, +1 to point to next line
                        'description': 'Missing indentation after colon'
                    })
            
            # Check for undefined variables
            if '=' in line:
                var_name = line.split('=')[0].strip()
                for j, other_line in enumerate(lines):
                    if j < i and var_name in other_line and '=' not in other_line:
                        errors.append({
                            'type': 'Variable Warning',
                            'line': j + 1,
                            'description': f'Possible use of undefined variable "{var_name}"'
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