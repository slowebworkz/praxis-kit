#!/bin/sh
# Invoke the native ast-grep binary, bypassing the broken pnpm shim that
# incorrectly runs it through Node.js instead of directly as an executable.
bin=$(ls node_modules/.pnpm/@ast-grep+cli@*/node_modules/@ast-grep/cli/ast-grep 2>/dev/null | head -1)
if [ -z "$bin" ]; then
  echo "ast-grep binary not found — run pnpm install" >&2
  exit 1
fi
exec "$bin" "$@"
