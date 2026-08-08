// BLX - Shared navigation: injects the site nav into #site-nav so it's defined once
(function() {
    var nav = document.getElementById('site-nav');
    if (!nav) return;

    // BLX - Detect subdirectory depth so links work from blog-posts/ etc.
    var depth = window.location.pathname.split('/').filter(function(p) {
        return p && p.indexOf('.') === -1;
    }).length;
    var prefix = depth > 0 ? '../'.repeat(depth) : '';

    nav.innerHTML =
        '<a href="' + prefix + 'index.html">Home</a>' +
        '<a href="' + prefix + 'blogs.html">Blogs</a>' +
        '<a href="' + prefix + 'github.html">GitHub</a>' +
        '<a href="https://blenux.github.io/blender-extensions/">Extensions</a>' +
        '<a href="' + prefix + 'about.html">About</a>' +
        '<select id="theme-select" aria-label="Choose theme"></select>';
})();
