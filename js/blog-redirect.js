// Blog redirect script - checks if current blog post HTML file exists
document.addEventListener('DOMContentLoaded', function() {
    // Only run on blog post pages (not on main blog index)
    if (window.location.pathname.includes('/blog-posts/')) {
        checkBlogPostExists();
    }
});

function checkBlogPostExists() {
    // Get the current blog post filename
    const currentPath = window.location.pathname;
    const filename = currentPath.split('/').pop();
    
    if (!filename || !filename.endsWith('.html')) {
        redirectToBlogs();
        return;
    }
    
    // Check if this HTML file actually exists on the server
    checkFileExists(filename);
}

function checkFileExists(filename) {
    // Try to fetch the current page to see if it exists
    fetch(window.location.href)
        .then(response => {
            if (response.status === 404) {
                console.log(`Blog post ${filename} not found (404), redirecting...`);
                redirectToBlogs();
            } else {
                console.log(`Blog post ${filename} exists, staying on page.`);
            }
        })
        .catch(error => {
            console.error('Error checking blog post existence:', error);
            // If we can't check, assume the post exists and stay on page
            console.log('Could not verify blog post existence, staying on page.');
        });
}

function redirectToBlogs() {
    // Show a brief message before redirecting
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div style="text-align: center; padding: 50px 20px;">
                <h1>Blog Post Not Found</h1>
                <p>This blog post has been removed or doesn't exist.</p>
                <p>Redirecting to <a href="../blogs.html">blog index</a>...</p>
            </div>
        `;
    }
    
    // Redirect after a short delay
    setTimeout(function() {
        window.location.href = '../blogs.html';
    }, 2000);
} 