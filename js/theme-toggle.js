// BLX - Theme selector script: defines the default stylesheet in one place and lets the user choose a theme
// Stores the user's preference in localStorage

(function() {
    const DEFAULT_THEME = 'i3a';
    const CSS_DIR = 'css';
    const STORAGE_KEY = 'blenux-theme';

    const THEMES = [
        { id: 'i3a', label: 'i3' },
        { id: 'style', label: 'Test' }
    ];

    function isValidTheme(themeId) {
        return THEMES.some(function(theme) {
            return theme.id === themeId;
        });
    }

    function getCssBasePath() {
        const path = window.location.pathname;
        const dirs = path.split('/').filter(function(part) {
            return part && part.indexOf('.') === -1;
        });
        return dirs.map(function() { return '../'; }).join('') + CSS_DIR + '/';
    }

    function getThemeFromHref(href) {
        const match = href.match(/\/css\/([^/]+)\.css(?:\?.*)?$/);
        if (match) {
            const filename = match[1];
            if (isValidTheme(filename)) {
                return filename;
            }
        }
        return DEFAULT_THEME;
    }

    function getBasePathFromHref(href) {
        const match = href.match(/(.*\/css\/)((?:[^/]+)\.css(?:\?.*)?)$/);
        return match ? match[1] : getCssBasePath();
    }

    function injectStylesheet() {
        let stylesheet = document.getElementById('theme-stylesheet');
        if (!stylesheet) {
            stylesheet = document.createElement('link');
            stylesheet.id = 'theme-stylesheet';
            stylesheet.rel = 'stylesheet';
            stylesheet.type = 'text/css';
            document.head.appendChild(stylesheet);
        }
        return stylesheet;
    }

    function setTheme(stylesheet, themeId) {
        const basePath = getBasePathFromHref(stylesheet.href || getCssBasePath() + DEFAULT_THEME + '.css');
        stylesheet.href = basePath + themeId + '.css';
        localStorage.setItem(STORAGE_KEY, themeId);

        const select = document.getElementById('theme-select');
        if (select) {
            select.value = themeId;
        }
    }

    function initHead() {
        const stylesheet = injectStylesheet();
        const savedTheme = localStorage.getItem(STORAGE_KEY);
        const themeId = (savedTheme && isValidTheme(savedTheme)) ? savedTheme : DEFAULT_THEME;

        // BLX - Apply saved preference or fall back to the centralized default theme
        setTheme(stylesheet, themeId);
    }

    function initSelect() {
        const stylesheet = document.getElementById('theme-stylesheet');
        if (!stylesheet) return;

        const select = document.getElementById('theme-select');
        if (!select) return;

        select.value = getThemeFromHref(stylesheet.href);

        select.addEventListener('change', function() {
            setTheme(stylesheet, select.value);
        });
    }

    // BLX - Inject stylesheet immediately so the default theme loads without FOUC
    initHead();

    // BLX - Wire up the selector once the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelect);
    } else {
        initSelect();
    }
})();
