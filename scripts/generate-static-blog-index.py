#!/usr/bin/env python3
"""
Generate static blog index for GitHub Pages compatibility.
Usage: python3 scripts/generate-static-blog-index.py
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
        elif in_body or (title and not date and not line.startswith('Tags: ') and not line.startswith('Excerpt: ')):
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
    """Generate static JavaScript with all blog posts embedded."""
    
    # Create the blog posts data
    posts_data = []
    for post in blog_posts:
        posts_data.append({
            'title': post['title'],
            'date': post['date'],
            'tags': post['tags'],
            'excerpt': post['excerpt'],
            'filename': post['filename']
        })
    
    # Sort posts by date (newest first)
    posts_data.sort(key=lambda x: datetime.strptime(x['date'], '%B %Y'), reverse=True)
    
    # Generate the JavaScript
    js_content = f'''// Static blog index generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// This file contains all blog posts for GitHub Pages compatibility

const staticBlogPosts = {posts_data};

document.addEventListener('DOMContentLoaded', function() {{
    displayBlogPosts();
}});

function displayBlogPosts() {{
    const blogContainer = document.getElementById('blog-posts');
    if (!blogContainer) return;
    
    if (staticBlogPosts.length === 0) {{
        blogContainer.innerHTML = '<p>No blog posts found.</p>';
        return;
    }}
    
    blogContainer.innerHTML = ''; // Clear existing content
    
    staticBlogPosts.forEach(post => {{
        const preview = createBlogPreview(post);
        blogContainer.appendChild(preview);
    }});
}}

function createBlogPreview(post) {{
    const article = document.createElement('article');
    article.className = 'blog-preview';
    
    const title = document.createElement('h2');
    const titleLink = document.createElement('a');
    titleLink.href = `blog-posts/${{post.filename}}`;
    titleLink.textContent = post.title;
    title.appendChild(titleLink);
    
    const date = document.createElement('p');
    date.innerHTML = `<em>Posted: ${{post.date}}</em>`;
    
    const excerpt = document.createElement('p');
    excerpt.textContent = post.excerpt;
    
    const tags = document.createElement('div');
    tags.className = 'tags';
    post.tags.forEach(tag => {{
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = tag;
        tags.appendChild(tagSpan);
    }});
    
    const readMore = document.createElement('p');
    const readMoreLink = document.createElement('a');
    readMoreLink.href = `blog-posts/${{post.filename}}`;
    readMoreLink.textContent = 'Read more...';
    readMore.appendChild(readMoreLink);
    
    article.appendChild(title);
    article.appendChild(date);
    article.appendChild(excerpt);
    article.appendChild(tags);
    article.appendChild(readMore);
    
    return article;
}}
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
    
    # Write the static JavaScript file
    static_js_file = js_dir / 'blog-index-static.js'
    with open(static_js_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"✅ Generated static blog index: {static_js_file}")
    print(f"📝 Contains {len(blog_files)} blog posts")
    
    # Update blogs.html to use static index
    blogs_html_file = project_root / 'blogs.html'
    if blogs_html_file.exists():
        with open(blogs_html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the dynamic loader with static loader
        content = content.replace('js/blog-loader.js', 'js/blog-index-static.js')
        
        with open(blogs_html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Updated blogs.html to use static index")
    
    print("🎉 Static blog index ready for GitHub Pages!")

if __name__ == '__main__':
    main() 