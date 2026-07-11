#!/usr/bin/env python3
"""
Generate blog posts from text files in the books folder.
Usage: python3 scripts/generate-blog-from-books.py
"""

import os
import re
from datetime import datetime
from pathlib import Path

def is_blog_file(content):
    """Check if a file contains 'blog = true' marker."""
    return 'blog = true' in content.lower()

def parse_text_content(content, filename):
    """Parse text content and extract metadata."""
    lines = content.split('\n')
    title = ''
    date = ''
    tags = []
    excerpt = ''
    body = []
    in_body = False
    
    # Extract filename without extension for title if no title found
    default_title = filename.replace('.txt', '').replace('.md', '').replace('-', ' ').replace('_', ' ')
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines at the beginning
        if not in_body and not line:
            continue
        
        # Look for title (first non-empty line or line starting with #)
        if not title and line:
            if line.startswith('# '):
                title = line[2:].strip()
            elif line.startswith('Title: '):
                title = line[7:].strip()
            elif not in_body and not line.startswith('"tags"') and not line.startswith('blog ='):
                title = line
        
        # Look for date
        elif not date and line.startswith('Date: '):
            date = line[6:].strip()
        
        # Look for tags (new format: "tags" content="tag1,tag2,tag3")
        elif line.startswith('"tags" content='):
            # Extract tags from "tags" content="tag1,tag2,tag3"
            match = re.search(r'"tags" content="([^"]+)"', line)
            if match:
                tags = [t.strip() for t in match.group(1).split(',')]
        
        # Look for excerpt
        elif line.startswith('Excerpt: '):
            excerpt = line[9:].strip()
        
        # Look for body separator
        elif line in ['---', 'BODY:']:
            in_body = True
            continue
        
        # Skip blog marker and tags line
        elif line.startswith('blog =') or line.startswith('"tags"'):
            continue
        
        # Everything else goes to body
        elif in_body or (title and not line.startswith('Tags: ') and not line.startswith('Excerpt: ')):
            body.append(line)
    
    # Use default title if none found
    if not title:
        title = default_title
    
    # Use current date if none specified
    if not date:
        date = datetime.now().strftime('%B %Y')
    
    # Use default tags if none specified
    if not tags:
        tags = ['general']
    
    # Use first paragraph as excerpt if none specified
    if not excerpt:
        first_paragraph = next((line for line in body if len(line) > 20), 'No Message Content.')
        excerpt = first_paragraph
    
    return {
        'title': title,
        'date': date,
        'tags': tags,
        'excerpt': excerpt,
        'body': [line for line in body if line]
    }

def convert_to_html(content):
    """Convert text content to HTML."""
    html = []
    in_list = False
    
    for line in content:
        # Headers
        if line.startswith('## '):
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append(f'<h2>{line[3:]}</h2>')
        elif line.startswith('### '):
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append(f'<h3>{line[4:]}</h3>')
        
        # Lists
        elif line.startswith('- ') or line.startswith('* '):
            if not in_list:
                html.append('<ul>')
                in_list = True
            html.append(f'<li>{line[2:]}</li>')
        
        # Paragraphs
        elif line.strip():
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append(f'<p>{line}</p>')
        
        # Empty lines
        else:
            if in_list:
                html.append('</ul>')
                in_list = False
    
    # Close any open list
    if in_list:
        html.append('</ul>')
    
    return '\n'.join(html)

def create_blog_post_html(metadata, content, filename):
    """Create the full HTML blog post."""
    html_content = convert_to_html(content)
    
    return f'''<!DOCTYPE html>
<!-- Generated from books/ source file -->
<html>
<head>
    <title>Blenux - {metadata['title']}</title>
    <meta name="tags" content="{', '.join(metadata['tags'])}">
    <meta name="excerpt" content="{metadata['excerpt']}">
    <link rel="stylesheet" type="text/css" href="../css/style.css">
</head>

<body>
    <header>{metadata['title']}</header>

    <nav>
        <a href="../index.html">Home</a>
        <a href="../blogs.html">Blogs</a>
        <a href="https://github.com/Blenux" title="Visit Blenux's GitHub profile">GitHub</a>
        <a href="../about.html">About</a>
    </nav>

    <main>
        <article>
            <h1>{metadata['title']}</h1>
            <p><em>Posted: {metadata['date']}</em></p>
            
            {html_content}
            
            <p><a href="../blogs.html">Back to Blog Index</a></p>
        </article>
    </main>

    <footer>
        &copy; 2026, All Rights Reserved
    </footer>

</body>
</html>'''

def main():
    """Main function to process all text files in books folder."""
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    books_dir = project_root / 'books'
    blog_posts_dir = project_root / 'blog-posts'
    
    # Ensure blog-posts directory exists
    blog_posts_dir.mkdir(exist_ok=True)
    
    # Get list of current blog HTML files
    current_html_files = set()
    for html_file in blog_posts_dir.glob('*.html'):
        current_html_files.add(html_file.stem)
    
    # Find all files in books folder
    all_files = list(books_dir.glob('*'))
    
    # Filter files that contain 'blog = true'
    blog_files = []
    for file_path in all_files:
        if file_path.is_file():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if is_blog_file(content):
                    blog_files.append((file_path, content))
            except Exception as e:
                print(f"Warning: Could not read {file_path.name}: {e}")
    
    # Get list of source files that should generate HTML
    source_files = set()
    for file_path, _ in blog_files:
        source_files.add(file_path.stem)
    
    # Find HTML files that should be deleted (no corresponding source file AND
    # marked as generated from books/)
    files_to_delete = current_html_files - source_files

    # Delete orphaned generated HTML files only
    deleted_count = 0
    for filename in files_to_delete:
        html_file = blog_posts_dir / f"{filename}.html"
        try:
            content = html_file.read_text(encoding='utf-8')
            if '<!-- Generated from books/ source file -->' in content:
                html_file.unlink()
                print(f"🗑️  Deleted: {filename}.html (source file removed)")
                deleted_count += 1
            else:
                print(f"⏩ Kept: {filename}.html (not generated from books/)")
        except Exception as e:
            print(f"❌ Error checking {filename}.html: {e}")
    
    if not blog_files:
        if deleted_count > 0:
            print("✅ Cleaned up orphaned blog posts.")
        else:
            print("No blog files found in books folder.")
        
        # Generate static index even if no posts (to clear it)
        generate_static_index(blog_files)
        return
    
    print(f"Found {len(blog_files)} blog file(s) in books folder.")
    
    for file_path, content in blog_files:
        try:
            # Parse the content
            metadata = parse_text_content(content, file_path.name)
            
            # Generate HTML
            html_content = create_blog_post_html(metadata, metadata['body'], file_path.name)
            
            # Create the HTML file
            html_filename = file_path.stem + '.html'
            html_file = blog_posts_dir / html_filename
            
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"✅ Generated: {html_filename}")
            print(f"   Title: {metadata['title']}")
            print(f"   Date: {metadata['date']}")
            print(f"   Tags: {', '.join(metadata['tags'])}")
            print()
            
        except Exception as e:
            print(f"❌ Error processing {file_path.name}: {e}")
    
    # BLX - Scan final blog-posts/ folder and rebuild the index
    # This picks up both pages generated from books/ and pages created directly
    generate_static_index()

    if deleted_count > 0:
        print("✅ Cleaned up orphaned blog posts.")

    print("🎉 Blog generation complete!")
    print(f"📁 HTML files created in: {blog_posts_dir}")
    print("🌐 View your blog at: http://localhost:8000/blogs.html")
    print("🚀 Blog data ready for GitHub Pages!")

def generate_static_index():
    """Generate static blog index from all HTML files in blog-posts/."""
    try:
        import subprocess
        import sys

        scan_script = Path(__file__).parent / 'scan-blog-posts.py'
        result = subprocess.run([sys.executable, str(scan_script)],
                              capture_output=True, text=True, cwd=Path(__file__).parent.parent)

        if result.returncode == 0:
            print("✅ Static blog index generated from blog-posts/")
        else:
            print(f"⚠️  Static index generation failed: {result.stderr}")

    except Exception as e:
        print(f"⚠️  Could not generate static index: {e}")

if __name__ == '__main__':
    main() 