#!/bin/bash

# Start auto blog watcher
# Usage: ./scripts/start-auto-blog.sh

echo "🚀 Starting auto blog watcher..."
echo "📝 Any file with 'blog = true' in the books folder will automatically generate a blog post"
echo "🛑 Press Ctrl+C to stop"
echo ""

# Run the auto watcher
python3 "$(dirname "$0")/auto-blog-watcher-simple.py" 