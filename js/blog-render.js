// BLX - Shared blog post rendering logic for both index.html and blogs.html
// Uses staticBlogPosts and staticBlogCategories from blog-data.js

document.addEventListener('DOMContentLoaded', function() {
    renderBlogUI();
});

function renderBlogUI() {
    const blogContainer = document.getElementById('blog-posts');
    if (!blogContainer) return;

    const categories = (typeof staticBlogCategories !== 'undefined') ? staticBlogCategories : [];
    const categoryContainer = document.getElementById('blog-categories');
    const searchContainer = document.getElementById('blog-search');

    // BLX - Render category tabs on the blog index page
    if (categoryContainer && categories.length > 0) {
        renderCategoryTabs(categoryContainer, categories, blogContainer);
    }

    // BLX - Render search box on the blog index page
    if (searchContainer) {
        renderSearchBox(searchContainer, blogContainer);
    }

    renderBlogPosts(blogContainer);
}

function renderCategoryTabs(container, categories, blogContainer) {
    container.innerHTML = '';

    const allButton = document.createElement('button');
    allButton.textContent = 'All';
    allButton.className = 'category-tab active';
    allButton.dataset.category = '';
    allButton.addEventListener('click', () => {
        setActiveCategory(allButton);
        renderBlogPosts(blogContainer);
    });
    container.appendChild(allButton);

    categories.forEach(category => {
        const button = document.createElement('button');
        button.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        button.className = 'category-tab';
        button.dataset.category = category;
        button.addEventListener('click', () => {
            setActiveCategory(button);
            renderBlogPosts(blogContainer);
        });
        container.appendChild(button);
    });
}

function setActiveCategory(activeButton) {
    const container = activeButton.parentElement;
    container.querySelectorAll('.category-tab').forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
}

function getActiveCategory() {
    const activeTab = document.querySelector('#blog-categories .category-tab.active');
    return activeTab ? activeTab.dataset.category : '';
}

function renderSearchBox(container, blogContainer) {
    container.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search posts...';
    input.className = 'blog-search-input';
    input.addEventListener('input', () => {
        renderBlogPosts(blogContainer);
    });

    container.appendChild(input);
}

function getSearchTerm() {
    const input = document.querySelector('#blog-search .blog-search-input');
    return input ? input.value.toLowerCase().trim() : '';
}

function renderBlogPosts(blogContainer) {
    const limit = blogContainer.getAttribute('data-limit');
    let posts = (typeof staticBlogPosts !== 'undefined') ? [...staticBlogPosts] : [];
    const activeCategory = getActiveCategory();
    const searchTerm = getSearchTerm();

    // Sort by timestamp descending (newest first)
    posts.sort((a, b) => {
        const tsA = a.timestamp || 0;
        const tsB = b.timestamp || 0;
        return tsB - tsA;
    });

    // BLX - Filter by selected category
    if (activeCategory) {
        posts = posts.filter(post => {
            return post.tags && post.tags.some(tag => tag.toLowerCase() === activeCategory);
        });
    }

    // BLX - Filter by search term (title, excerpt, tags)
    if (searchTerm) {
        posts = posts.filter(post => {
            const inTitle = post.title.toLowerCase().includes(searchTerm);
            const inExcerpt = post.excerpt.toLowerCase().includes(searchTerm);
            const inTags = post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm));
            return inTitle || inExcerpt || inTags;
        });
    }

    // Apply limit if specified (used on front page for recent posts)
    if (limit && !isNaN(limit)) {
        posts = posts.slice(0, parseInt(limit));
    }

    blogContainer.innerHTML = '';

    if (posts.length === 0) {
        blogContainer.innerHTML = '<p>No blog posts found.</p>';
        return;
    }

    posts.forEach(post => {
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
    if (post.tags && post.tags.length > 0) {
        post.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            tags.appendChild(tagSpan);
        });
    }

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
