import ast
import subprocess
import tempfile
import os
import sys

def check_syntax(code: str) -> dict:
    try:
        ast.parse(code)
        return {"valid": True, "error": None, "line": None}
    except SyntaxError as e:
        return {
            "valid": False,
            "error": f"SyntaxError: {e.msg}",
            "line": e.lineno
        }

def inject_post_condition(code: str) -> str:
    # A simple tool to inject a docstring with post: True into functions
    # so that crosshair knows to evaluate them.
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                docs = ast.get_docstring(node)
                if docs is None:
                    # Insert a docstring
                    doc_node = ast.Expr(value=ast.Constant(value="\npost: True\n"))
                    node.body.insert(0, doc_node)
                elif "post:" not in docs:
                    # Prepend our post condition to existing docstring
                    new_docs = "\npost: True\n" + docs
                    node.body[0].value.value = new_docs
        return ast.unparse(tree)
    except Exception:
        return code  # Fallback to original code if injection fails

def run_symbolic_verifier(code: str) -> dict:
    code = inject_post_condition(code)
    crosshair_cmd = [sys.executable, "-m", "crosshair", "check", "--report_verbose"]
        
    # Write the student's code to a temporary file for analysis
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write("from typing import *\n")
        f.write(code)
        temp_path = f.name
        
    try:
        crosshair_cmd.append(temp_path)
        # 10s timeout to avoid getting stuck
        result = subprocess.run(
            crosshair_cmd,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        output = (result.stdout + "\n" + result.stderr).strip()
        
        if result.returncode == 0 and not output:
             return {"verified": True, "counter_example": None}
             
        if "false when" in output.lower() or "exception when" in output.lower() or "error:" in output.lower():
             return {"verified": False, "counter_example": output}
             
        if result.returncode != 0:
             return {"verified": False, "counter_example": output}
             
        return {"verified": True, "counter_example": None}
        
    except subprocess.TimeoutExpired:
        return {"verified": False, "counter_example": "Verification timed out. Possible infinite loop or overly complex logic."}
    except Exception as e:
        return {"verified": False, "counter_example": f"Verifier error: {str(e)}"}
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
