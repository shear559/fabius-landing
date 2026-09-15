"""Run an unlabelled candidate without supplying expected values to it.

Called by score.py in a fresh interpreter with -I -S -B. This is process
isolation for reproducibility, not a hostile-code security sandbox.
"""

import contextlib
import importlib.util
import io
import json
import math
import sys
from collections.abc import Mapping


class QuietOutput(io.TextIOBase):
    def write(self, value):
        return len(value)


def main():
    parameters = json.load(sys.stdin)
    try:
        with contextlib.redirect_stdout(QuietOutput()), contextlib.redirect_stderr(QuietOutput()):
            specification = importlib.util.spec_from_file_location("anonymous_candidate", sys.argv[1])
            module = importlib.util.module_from_spec(specification)
            sys.modules[specification.name] = module
            specification.loader.exec_module(module)
            function = module.solve
            if not callable(function):
                raise TypeError("solve is not callable")
    except BaseException as error:
        print(json.dumps({"import_error": type(error).__name__ + ": " + str(error)[:300]}))
        return
    results = []
    for parameter in parameters:
        try:
            with contextlib.redirect_stdout(QuietOutput()), contextlib.redirect_stderr(QuietOutput()):
                output = function(parameter)
            if not isinstance(output, Mapping):
                raise TypeError("solve must return a mapping")
            result = {}
            for key in ("x", "y", "z", "value"):
                value = output[key]
                if isinstance(value, (bool, str, bytes)):
                    raise TypeError(key + " must be numeric, not boolean or text")
                result[key] = float(value)
                if not math.isfinite(result[key]):
                    raise ValueError(key + " is not finite")
            results.append({"ok": True, "output": result})
        except BaseException as error:
            results.append({"ok": False, "error": type(error).__name__ + ": " + str(error)[:300]})
    print(json.dumps({"results": results}, allow_nan=False))


if __name__ == "__main__":
    main()
