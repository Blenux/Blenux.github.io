// Automated blog loader script that scans the blog-posts folder
document.addEventListener('DOMContentLoaded', function() {
    // Function to extract metadata from HTML content
    function extractMetadata(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Extract title from <title> tag
        const title = doc.querySelector('title')?.textContent.replace('Blenux - ', '') || 'Untitled';
        
        // Extract date from the first <em> tag in the article
        const dateElement = doc.querySelector('article em');
        const date = dateElement?.textContent.replace('Posted: ', '') || 'Unknown Date';
        
        // Extract excerpt - check for custom excerpt first, then fall back to first paragraph
        let excerpt = '';
        
        // Check for custom excerpt in meta tag
        const metaExcerpt = doc.querySelector('meta[name="excerpt"]');
        if (metaExcerpt && metaExcerpt.getAttribute('content')) {
            excerpt = metaExcerpt.getAttribute('content');
        } else {
            // Fall back to first paragraph after the date
            const paragraphs = doc.querySelectorAll('article p');
            for (let i = 0; i < paragraphs.length; i++) {
                const p = paragraphs[i];
                if (!p.querySelector('em') && p.textContent.trim().length > 20) {
                    excerpt = p.textContent.trim();
                    break;
                }
            }
        }
        
        // Extract tags from the HTML file (we'll add a meta tag for this)
        const metaTags = doc.querySelector('meta[name="tags"]');
        const tags = metaTags ? metaTags.getAttribute('content').split(',').map(t => t.trim()) : [];
        
        return { title, date, excerpt, tags };
    }

    // Function to create blog post preview
    function createBlogPreview(post) {
        const article = document.createElement('article');
        article.className = 'blog-preview';
        
        const title = document.createElement('h2');
        const titleLink = document.createElement('a');
        titleLink.href = `blog-posts/${post.filename}`;
        titleLink.textContent = post.title;
        title.appendChild(titleLink);
        
        const date = document.createElement('p');
        date.innerHTML = `<em>Posted: ${post.date}</em>`;
        
        const excerpt = document.createElement('p');
        excerpt.textContent = post.excerpt;
        
        const tags = document.createElement('div');
        tags.className = 'tags';
        post.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            tags.appendChild(tagSpan);
        });
        
        const readMore = document.createElement('p');
        const readMoreLink = document.createElement('a');
        readMoreLink.href = `blog-posts/${post.filename}`;
        readMoreLink.textContent = 'Read more...';
        readMore.appendChild(readMoreLink);
        
        article.appendChild(title);
        article.appendChild(date);
        article.appendChild(excerpt);
        article.appendChild(tags);
        article.appendChild(readMore);
        
        return article;
    }

    // Function to scan blog-posts folder and load posts
    async function loadBlogPosts() {
        try {
            // Get list of HTML files in blog-posts folder
            const response = await fetch('blog-posts/');
            const html = await response.text();
            
            // Parse the directory listing to find HTML files
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a[href$=".html"]');
            
            const blogPosts = [];
            
            // Load each HTML file and extract metadata
            for (const link of links) {
                const filename = link.getAttribute('href');
                if (filename && filename.endsWith('.html')) {
                    try {
                        const postResponse = await fetch(`blog-posts/${filename}`);
                        const postHtml = await postResponse.text();
                        const metadata = extractMetadata(postHtml);
                        
                        blogPosts.push({
                            ...metadata,
                            filename: filename
                        });
                    } catch (error) {
                        console.warn(`Failed to load ${filename}:`, error);
                    }
                }
            }
            
            // Sort posts by date (newest first)
            blogPosts.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });
            
            // Display the posts
            const blogContainer = document.getElementById('blog-posts');
            if (blogContainer) {
                blogContainer.innerHTML = ''; // Clear existing content
                blogPosts.forEach(post => {
                    const preview = createBlogPreview(post);
                    blogContainer.appendChild(preview);
                });
                
                // Show message if no posts found
                if (blogPosts.length === 0) {
                    blogContainer.innerHTML = '<p>No blog posts found.</p>';
                }
            }
            
        } catch (error) {
            console.error('Failed to load blog posts:', error);
            const blogContainer = document.getElementById('blog-posts');
            if (blogContainer) {
                blogContainer.innerHTML = '<p>Failed to load blog posts. Please check the console for details.</p>';
            }
        }
    }

    // Load blog posts when page loads
    loadBlogPosts();
}); 