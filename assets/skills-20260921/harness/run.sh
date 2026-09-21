#!/bin/bash
# One clean headless run per skill: Claude Code with ONLY the Fabius plugin loaded, a fresh
# folder holding the fixture, no user settings, no MCP servers, no web tools, 25-minute cap.
# usage: bash harness/run.sh <key>     (keys = file names in briefs/, without .md)
set -u
KEY=$1
HERE=$(cd "$(dirname "$0")/.." && pwd)
CL="${CLAUDE_BIN:-$HOME/Library/Application Support/Claude/claude-code/2.1.275/claude.app/Contents/MacOS/claude}"
PLUGIN="${FABIUS_PLUGIN:-$HOME/.claude/plugins/cache/fabius/fabius/3.2.0}"
MODEL="${RUN_MODEL:-claude-sonnet-5}"
ROOT="${RUN_ROOT:-/private/tmp/claude-501/fabius-skill-runs}/$KEY"
rm -rf "$ROOT"; mkdir -p "$ROOT/work"
if [ -f "$HERE/fixtures/$KEY/repo.bundle" ]; then
  git clone -q -b feature/keep-case "$HERE/fixtures/$KEY/repo.bundle" "$ROOT/work" 2>/dev/null
  (cd "$ROOT/work" && git branch -q main origin/main && git remote remove origin)
else
  cp -R "$HERE/fixtures/$KEY/." "$ROOT/work/"
fi
mkdir -p "$ROOT/work/out"
python3 - "$ROOT" "$KEY" "$MODEL" "$PLUGIN" "$("$CL" --version 2>/dev/null)" <<'PY'
import json, sys, time, pathlib
root, key, model, plugin, cli = sys.argv[1:6]
pj = json.load(open(pathlib.Path(plugin) / ".claude-plugin/plugin.json"))
json.dump({"key": key, "model": model, "cli": cli.strip(), "plugin_version": pj.get("version"),
           "started": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "cap_seconds": 1500},
          open(pathlib.Path(root) / "meta.json", "w"), indent=1)
PY
START=$(date +%s)
( cd "$ROOT/work" && env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT perl -e 'alarm shift; exec @ARGV' 1500 \
    "$CL" -p --model "$MODEL" --setting-sources project --strict-mcp-config --no-session-persistence \
    --plugin-dir "$PLUGIN" --permission-mode bypassPermissions --disallowedTools WebFetch WebSearch \
    --output-format stream-json --verbose "$(cat "$HERE/briefs/$KEY.md")" < /dev/null \
    > "$ROOT/stream.jsonl" 2> "$ROOT/stderr.txt" )
CODE=$?
END=$(date +%s)
python3 - "$ROOT" "$CODE" "$((END-START))" <<'PY'
import json, sys, time, pathlib
root, code, secs = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
p = pathlib.Path(root) / "meta.json"; m = json.load(open(p))
m.update({"exit_code": code, "elapsed_seconds": secs, "ended": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
          "timed_out": code in (142, 14) or secs >= 1500})
json.dump(m, open(p, "w"), indent=1)
PY
echo "$KEY done: exit $CODE in $((END-START))s"
