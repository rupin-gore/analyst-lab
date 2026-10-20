/**
 * Python helpers loaded into Pyodide once. Shared by the browser worker and the Node test that
 * runs every reference solution, so both grade identically.
 */
export const PY_HARNESS = String.raw`
import ast, io, json, contextlib, traceback
import pandas as pd
import numpy as np

pd.set_option("display.max_columns", 30)
pd.set_option("display.width", 160)

_AL_FILES = {}

def _al_fresh(name):
    """A clean copy of a dataset table, for tests (the learner may have mutated theirs)."""
    return pd.read_csv(_AL_FILES[name])

def _al_new_namespace():
    ns = {"pd": pd, "np": np, "__name__": "__main__"}
    for name, path in _AL_FILES.items():
        ns[name] = pd.read_csv(path)
    return ns

def _al_display(value):
    if isinstance(value, pd.DataFrame):
        return {"kind": "html", "text": value.head(50).to_html(max_rows=50, border=0, classes="df")
                + f"<p class='df-shape'>{value.shape[0]} rows × {value.shape[1]} columns</p>"}
    if isinstance(value, pd.Series):
        return {"kind": "text", "text": value.head(50).to_string() + f"\n[{len(value)} rows]"}
    return {"kind": "text", "text": repr(value)}

def _al_run_cell(code, ns):
    out = io.StringIO()
    result = {"stdout": "", "display": None, "error": None}
    try:
        tree = ast.parse(code, "<cell>", "exec")
        last = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last = ast.Expression(tree.body.pop().value)
        with contextlib.redirect_stdout(out):
            exec(compile(tree, "<cell>", "exec"), ns)
            if last is not None:
                value = eval(compile(last, "<cell>", "eval"), ns)
                if value is not None:
                    result["display"] = _al_display(value)
    except Exception as e:
        tb = traceback.format_exception(type(e), e, e.__traceback__)
        # Hide harness frames; keep the learner's.
        result["error"] = "".join(line for line in tb if "_al_" not in line and "pyodide" not in line)
    result["stdout"] = out.getvalue()
    return json.dumps(result)

def _al_run_tests(test_code, ns):
    tns = dict(ns)
    tns["_fresh"] = _al_fresh
    results = []
    try:
        exec(compile(test_code, "<tests>", "exec"), tns)
    except Exception as e:
        return json.dumps([{"name": "setup", "label": "Test setup", "passed": False,
                            "message": f"{type(e).__name__}: {e}"}])
    for name, fn in list(tns.items()):
        if not (name.startswith("test_") and callable(fn)):
            continue
        label = (fn.__doc__ or name).strip().splitlines()[0]
        try:
            fn()
            results.append({"name": name, "label": label, "passed": True, "message": ""})
        except AssertionError as e:
            results.append({"name": name, "label": label, "passed": False, "message": str(e) or "Check failed."})
        except NameError as e:
            results.append({"name": name, "label": label, "passed": False,
                            "message": f"{e}. Did you create the variable the task asks for?"})
        except Exception as e:
            results.append({"name": name, "label": label, "passed": False, "message": f"{type(e).__name__}: {e}"})
    return json.dumps(results)
`;
