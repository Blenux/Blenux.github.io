#!/usr/bin/env python3
"""
Simple auto blog watcher - automatically detects changes in books folder and regenerates blog posts.
Usage: python3 scripts/auto-blog-watcher-simple.py
"""

import time
import os
import subprocess
import sys
from pathlib import Path

def get_file_hash(file_path):
    """Get a simple hash of file modification time and size."""
    try:
        stat = os.stat(file_path)
        return (stat.st_mtime, stat.st_size)
    except:
        return None

def main():
    """Main function to watch books folder for changes."""
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    books_dir = project_root / 'books'
    generator_script = script_dir / 'generate-blog-from-books.py'
    
    if not books_dir.exists():
        print(f"❌ Books directory not found: {books_dir}")
        return
    
    if not generator_script.exists():
        print(f"❌ Blog generator script not found: {generator_script}")
        return
    
    print(f"👀 Watching for changes in: {books_dir}")
    print("📝 Any file with 'blog = true' will automatically generate a blog post")
    print("🛑 Press Ctrl+C to stop watching")
    print()
    
    # Track file hashes
    file_hashes = {}
    
    # Run initial generation
    print("🚀 Running initial blog generation...")
    try:
        subprocess.run([sys.executable, str(generator_script)], cwd=project_root, check=True)
        print("✅ Initial generation complete!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error in initial generation: {e}")
    print()
    
    try:
        while True:
            # Check all files in books directory
            changed_files = []
            
            for file_path in books_dir.iterdir():
                if file_path.is_file():
                    current_hash = get_file_hash(file_path)
                    file_key = str(file_path)
                    
                    if file_key not in file_hashes:
                        # New file
                        file_hashes[file_key] = current_hash
                        changed_files.append(file_path.name)
                    elif file_hashes[file_key] != current_hash:
                        # Modified file
                        file_hashes[file_key] = current_hash
                        changed_files.append(file_path.name)
            
            # Remove deleted files from tracking
            deleted_files = []
            for file_key in list(file_hashes.keys()):
                if not Path(file_key).exists():
                    deleted_files.append(Path(file_key).name)
                    del file_hashes[file_key]
            
            # If there are changes, regenerate blog posts
            if changed_files or deleted_files:
                if changed_files:
                    print(f"📝 Files changed: {', '.join(changed_files)}")
                if deleted_files:
                    print(f"🗑️  Files deleted: {', '.join(deleted_files)}")
                
                print("🔄 Regenerating blog posts...")
                
                try:
                    subprocess.run([sys.executable, str(generator_script)], 
                                  cwd=project_root, check=True)
                    print("✅ Blog posts updated successfully!")
                except subprocess.CalledProcessError as e:
                    print(f"❌ Error updating blog posts: {e}")
                
                print()
            
            # Wait before checking again
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping file watcher...")
    
    print("👋 File watcher stopped.")

if __name__ == '__main__':
    main() 