#!/usr/bin/env python3
"""
Scan blog-posts/ for HTML files and generate js/blog-data.js.

Usage: python3 scripts/scan-blog-posts.py

This is the simple direct-HTML workflow: create an HTML page in
blog-posts/ and push it. The script extracts metadata from each page
and builds the static index used by index.html and blogs.html.
"""

import os
import re
import json
import html
import subprocess
from datetime import datetime, timezone
from pathlib import Path

SITE_URL = 'https://blenux.github.io'
STATIC_PAGES = ['index.html', 'blogs.html', 'github.html', 'about.html']
FEED_MAX_ENTRIES = 20


def get_auto_date(file_path):
    """Determine the best 'uploaded/created' date for a file.

    Priority:
    1. Git commit date of the file (most accurate for 'uploaded')
    2. File system modification time
    3. Current date/time
    """
    # BLX - Try git commit date first (works in CI and local git repos)
    try:
        result = subprocess.run(
            ['git', 'log', '-1', '--format=%ct', '--', str(file_path)],
            capture_output=True, text=True, cwd=file_path.parent
        )
        if result.returncode == 0 and result.stdout.strip():
            commit_ts = int(result.stdout.strip())
            return datetime.fromtimestamp(commit_ts).strftime('%Y-%m-%d')
    except Exception:
        pass

    # BLX - Fall back to file modification time
    try:
        mtime = os.path.getmtime(file_path)
        return datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
    except Exception:
        pass

    # BLX - Final fallback: right now
    return datetime.now().strftime('%Y-%m-%d')


def parse_date_to_timestamp(date_str):
    """Parse various date formats and return a Unix timestamp for sorting."""
    if not date_str or date_str == 'Unknown Date':
        return 0

    formats = [
        '%Y-%m-%d',           # 2026-07-11
        '%B %d, %Y',          # July 11, 2026
        '%b %d, %Y',          # Jul 11, 2026
        '%B %Y',              # July 2026
        '%b %Y',              # Jul 2026
        '%Y-%m',              # 2026-07
        '%Y',                 # 2026
    ]

    # BLX - Pin to UTC so local runs and CI generate identical timestamps
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt).replace(tzinfo=timezone.utc)
            return dt.timestamp()
        except ValueError:
            continue

    year_match = re.search(r'(\d{4})', date_str)
    if year_match:
        try:
            return datetime(int(year_match.group(1)), 1, 1, tzinfo=timezone.utc).timestamp()
        except ValueError:
            pass

    return 0


def extract_text_from_html(html_content, tag_pattern, default=None):
    """Extract decoded text content from a simple HTML tag pattern."""
    match = re.search(tag_pattern, html_content, re.IGNORECASE | re.DOTALL)
    if match:
        return html.unescape(match.group(1)).strip()
    return default


def extract_metadata(file_path, html_content):
    """Extract blog metadata from a generated blog-posts HTML file."""
    filename = file_path.name

    # Title: prefer <title>, strip site prefix, fall back to <article> <h1>
    title = extract_text_from_html(html_content, r'<title[^>]*>(?:.*?-\s*)?(.*?)</title>')
    if not title:
        title = extract_text_from_html(html_content, r'<article[^>]*>.*?<h1[^>]*>(.*?)</h1>')
    if not title:
        title = file_path.stem.replace('-', ' ').replace('_', ' ').title()

    # Date: prefer <meta name="date">, then "Posted: ..." in <em>,
    # then auto-detect from git commit / file mtime / current time
    date = extract_text_from_html(html_content, r'<meta[^>]+name=["\']date["\'][^>]+content=["\']([^"\']+)')
    if not date:
        date = extract_text_from_html(html_content, r'<em[^>]*>\s*Posted:\s*(.*?)\s*</em>')
        if date:
            # BLX - Strip markup like <time datetime="..."> wrapped around the date
            date = re.sub(r'<[^>]+>', '', date).strip()
    if not date:
        date = get_auto_date(file_path)

    # Tags
    tags_raw = extract_text_from_html(html_content, r'<meta[^>]+name=["\']tags["\'][^>]+content=["\']([^"\']+)')
    tags = [t.strip() for t in tags_raw.split(',') if t.strip()] if tags_raw else []

    # Excerpt
    excerpt = extract_text_from_html(html_content, r'<meta[^>]+name=["\']excerpt["\'][^>]+content=["\']([^"\']+)')
    if not excerpt:
        # Fall back to first paragraph in <article> that isn't the date line
        first_p = extract_text_from_html(
            html_content,
            r'<article[^>]*>.*?<p>(?!<em)(.*?)</p>'
        )
        excerpt = first_p if first_p else 'No excerpt available.'

    timestamp = parse_date_to_timestamp(date)
    return {
        'title': title,
        'date': date,
        'date_iso': (datetime.fromtimestamp(timestamp, tz=timezone.utc).date().isoformat()
                     if timestamp else ''),
        'timestamp': timestamp,
        'tags': tags,
        'excerpt': excerpt,
        'filename': filename,
    }


def generate_blog_data_js(posts):
    """Generate the contents of js/blog-data.js from a list of posts."""
    posts.sort(key=lambda x: x['timestamp'], reverse=True)

    # BLX - Build a sorted list of unique categories from all post tags
    categories = sorted({tag.lower() for post in posts for tag in post.get('tags', [])})

    return f'''// BLX - Auto-generated blog post data on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// This file contains blog post metadata for GitHub Pages compatibility
// Rendering logic is in blog-render.js

const staticBlogPosts = {json.dumps(posts, indent=2, ensure_ascii=False)};

const staticBlogCategories = {json.dumps(categories, indent=2, ensure_ascii=False)};
'''


def xml_escape(text):
    return html.escape(str(text or ''), quote=True)


def get_git_lastmod(file_path):
    """Last git commit date (YYYY-MM-DD) for a file — stable across CI checkouts,
    unlike file mtime which becomes the checkout time."""
    try:
        result = subprocess.run(
            ['git', 'log', '-1', '--format=%ct', '--', str(file_path)],
            capture_output=True, text=True, cwd=file_path.parent
        )
        if result.returncode == 0 and result.stdout.strip():
            return datetime.fromtimestamp(int(result.stdout.strip())).date().isoformat()
    except Exception:
        pass
    try:
        return datetime.fromtimestamp(file_path.stat().st_mtime).date().isoformat()
    except OSError:
        return ''


def generate_sitemap_xml(posts, project_root):
    """Generate sitemap.xml covering static pages and all blog posts."""
    urls = []
    for page in STATIC_PAGES:
        urls.append((f'{SITE_URL}/{page}', get_git_lastmod(project_root / page)))

    for post in posts:
        urls.append((f"{SITE_URL}/blog-posts/{post['filename']}", post.get('date_iso') or ''))

    entries = ''.join(
        f'  <url>\n    <loc>{xml_escape(loc)}</loc>\n'
        + (f'    <lastmod>{lastmod}</lastmod>\n' if lastmod else '')
        + '  </url>\n'
        for loc, lastmod in urls
    )
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f'{entries}</urlset>\n')


def generate_feed_xml(posts):
    """Generate an Atom feed (feed.xml) for the blog."""
    def rfc3339(ts):
        return (datetime.fromtimestamp(ts).astimezone(timezone.utc)
                .strftime('%Y-%m-%dT%H:%M:%SZ'))

    entries = []
    for post in posts[:FEED_MAX_ENTRIES]:
        url = f"{SITE_URL}/blog-posts/{post['filename']}"
        updated = rfc3339(post['timestamp']) if post.get('timestamp') else ''
        entries.append(
            '  <entry>\n'
            f'    <title>{xml_escape(post["title"])}</title>\n'
            f'    <link href="{xml_escape(url)}"/>\n'
            f'    <id>{xml_escape(url)}</id>\n'
            + (f'    <updated>{updated}</updated>\n' if updated else '')
            + f'    <summary>{xml_escape(post["excerpt"])}</summary>\n'
              '  </entry>\n'
        )

    feed_updated = rfc3339(posts[0]['timestamp']) if posts else rfc3339(datetime.now().timestamp())
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<feed xmlns="http://www.w3.org/2005/Atom">\n'
            '  <title>Blenux</title>\n'
            f'  <link href="{SITE_URL}/"/>\n'
            f'  <link rel="self" href="{SITE_URL}/feed.xml"/>\n'
            f'  <id>{SITE_URL}/</id>\n'
            f'  <updated>{feed_updated}</updated>\n'
            '  <author><name>Blenux</name></author>\n'
            f'{"".join(entries)}</feed>\n')


def main():
    """Scan blog-posts/ and regenerate js/blog-data.js."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    blog_posts_dir = project_root / 'blog-posts'
    js_dir = project_root / 'js'

    if not blog_posts_dir.exists():
        print(f"❌ Blog posts directory not found: {blog_posts_dir}")
        return

    posts = []
    html_files = sorted(blog_posts_dir.glob('*.html'))

    for html_file in html_files:
        try:
            content = html_file.read_text(encoding='utf-8')
            metadata = extract_metadata(html_file, content)
            posts.append(metadata)
            print(f"✅ Scanned: {html_file.name} -> '{metadata['title']}'")
        except Exception as e:
            print(f"⚠️  Could not scan {html_file.name}: {e}")

    js_dir.mkdir(exist_ok=True)
    output_file = js_dir / 'blog-data.js'
    output_file.write_text(generate_blog_data_js(posts), encoding='utf-8')

    (project_root / 'sitemap.xml').write_text(
        generate_sitemap_xml(posts, project_root), encoding='utf-8')
    (project_root / 'feed.xml').write_text(
        generate_feed_xml(posts), encoding='utf-8')

    print(f"\n📝 Found {len(posts)} post(s) in blog-posts/")
    print(f"✅ Generated: {output_file}")
    print(f"✅ Generated: {project_root / 'sitemap.xml'}")
    print(f"✅ Generated: {project_root / 'feed.xml'}")


if __name__ == '__main__':
    main()
