// Static blog index generated on 2026-07-20 21:57:16
// This file contains all blog posts for GitHub Pages compatibility

const staticBlogPosts = [{'title': 'Title', 'date': 'July 2026', 'tags': ['general'], 'excerpt': 'No Message Content.', 'filename': 'test.html'}];

document.addEventListener('DOMContentLoaded', function() {
    displayBlogPosts();
});

function displayBlogPosts() {
    const blogContainer = document.getElementById('blog-posts');
    if (!blogContainer) return;
    
    if (staticBlogPosts.length === 0) {
        blogContainer.innerHTML = '<p>No blog posts found.</p>';
        return;
    }
    
    blogContainer.innerHTML = ''; // Clear existing content
    
    staticBlogPosts.forEach(post => {
        const preview = createBlogPreview(post);
        blogContainer.appendChild(preview);
    });
}

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
