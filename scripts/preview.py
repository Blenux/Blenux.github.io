#!/usr/bin/env python3
"""
Start a local preview server for the site.

Usage:
    python3 scripts/preview.py
    python3 scripts/preview.py --port 8080
    python3 scripts/preview.py --regenerate

--regenerate runs scan-blog-posts.py first so the index is up to date.
"""

import argparse
import subprocess
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


def regenerate_index(project_root):
    """Run scan-blog-posts.py to refresh js/blog-data.js before serving."""
    scan_script = project_root / 'scripts' / 'scan-blog-posts.py'
    print("🔄 Regenerating blog index...")
    result = subprocess.run([sys.executable, str(scan_script)], cwd=project_root)
    if result.returncode != 0:
        print("⚠️  Index regeneration failed, continuing anyway.")
    print()


def main():
    parser = argparse.ArgumentParser(description="Local preview server for Blenux.github.io")
    parser.add_argument('--port', type=int, default=8000, help='Port to serve on (default: 8000)')
    parser.add_argument('--regenerate', action='store_true', help='Regenerate blog index before serving')
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    if args.regenerate:
        regenerate_index(project_root)

    print(f"🌐 Serving site at http://localhost:{args.port}/")
    print("Press Ctrl+C to stop")

    server = HTTPServer(('0.0.0.0', args.port), SimpleHTTPRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        server.shutdown()


if __name__ == '__main__':
    main()
