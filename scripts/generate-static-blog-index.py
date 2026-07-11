#!/usr/bin/env python3
"""
Generate static blog index for GitHub Pages compatibility.
Usage: python3 scripts/generate-static-blog-index.py
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path

def parse_date_to_timestamp(date_str):
    """Parse various date formats and return a Unix timestamp for sorting."""
    if not date_str or date_str == 'Unknown Date':
        return 0

    formats = [
        '%Y-%m-%d',           # 2026-07-11
        '%B %d, %Y',           # July 11, 2026
        '%b %d, %Y',           # Jul 11, 2026
        '%B %Y',               # July 2026
        '%b %Y',               # Jul 2026
        '%Y-%m',               # 2026-07
        '%Y',                  # 2026
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.timestamp()
        except ValueError:
            continue

    # BLX - If no format matches, try to extract a year at least
    year_match = re.search(r'(\d{4})', date_str)
    if year_match:
        try:
            return datetime(int(year_match.group(1)), 1, 1).timestamp()
        except ValueError:
            pass

    return 0

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

def generate_static_blog_index(blog_posts):
    """Generate static JavaScript data file with all blog posts."""

    # Create the blog posts data
    posts_data = []
    for post in blog_posts:
        posts_data.append({
            'title': post['title'],
            'date': post['date'],
            'timestamp': parse_date_to_timestamp(post['date']),
            'tags': post['tags'],
            'excerpt': post['excerpt'],
            'filename': post['filename']
        })

    # Sort posts by timestamp (newest first)
    posts_data.sort(key=lambda x: x['timestamp'], reverse=True)

    # Generate the JavaScript data file (rendering logic is in blog-render.js)
    js_content = f'''// BLX - Auto-generated blog post data on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// This file contains blog post metadata for GitHub Pages compatibility
// Rendering logic is in blog-render.js

const staticBlogPosts = {json.dumps(posts_data, indent=2, ensure_ascii=False)};
'''

    return js_content

def main():
    """Main function to generate static blog index."""
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    books_dir = project_root / 'books'
    js_dir = project_root / 'js'
    
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
                    metadata = parse_text_content(content, file_path.name)
                    metadata['filename'] = file_path.stem + '.html'
                    blog_files.append(metadata)
            except Exception as e:
                print(f"Warning: Could not read {file_path.name}: {e}")
    
    if not blog_files:
        print("No blog files found in books folder.")
        return
    
    print(f"Found {len(blog_files)} blog file(s) in books folder.")
    
    # Generate static JavaScript
    js_content = generate_static_blog_index(blog_files)
    
    # Write the static JavaScript data file
    static_js_file = js_dir / 'blog-data.js'
    with open(static_js_file, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"✅ Generated blog data: {static_js_file}")
    print(f"📝 Contains {len(blog_files)} blog posts")

    # Update blogs.html to use blog-data.js + blog-render.js
    blogs_html_file = project_root / 'blogs.html'
    if blogs_html_file.exists():
        with open(blogs_html_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace any old script references with the new shared approach
        content = content.replace('js/blog-loader.js', 'js/blog-data.js"></script>\n    <script src="js/blog-render.js')
        content = content.replace('js/blog-index-static.js', 'js/blog-data.js"></script>\n    <script src="js/blog-render.js')

        # BLX - If blog-render.js is not yet referenced, add it after blog-data.js
        if 'blog-render.js' not in content and 'blog-data.js' in content:
            content = content.replace(
                'js/blog-data.js"></script>',
                'js/blog-data.js"></script>\n    <script src="js/blog-render.js"></script>'
            )

        with open(blogs_html_file, 'w', encoding='utf-8') as f:
            f.write(content)

        print("✅ Updated blogs.html to use blog-data.js + blog-render.js")

    # BLX - Update index.html to show recent posts
    index_html_file = project_root / 'index.html'
    if index_html_file.exists():
        with open(index_html_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Add blog scripts if not present
        if 'blog-data.js' not in content:
            content = content.replace(
                '</body>',
                '    <script src="js/blog-data.js"></script>\n    <script src="js/blog-render.js"></script>\n</body>'
            )

        # Add recent posts section if not present
        if 'id="blog-posts"' not in content:
            content = content.replace(
                '</main>',
                '        <h2>Recent Posts</h2>\n        <div id="blog-posts" data-limit="5">\n            <p>Loading blog posts...</p>\n        </div>\n        <p><a href="blogs.html">View all posts &rarr;</a></p>\n    </main>'
            )

        with open(index_html_file, 'w', encoding='utf-8') as f:
            f.write(content)

        print("✅ Updated index.html with recent posts section")

    print("🎉 Static blog index ready for GitHub Pages!")

if __name__ == '__main__':
    main() 