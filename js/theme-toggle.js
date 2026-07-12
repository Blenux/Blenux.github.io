// BLX - Theme selector script: injects the shared layout + chosen theme stylesheet
// Stores the user's preference in localStorage

(function() {
    const DEFAULT_THEME = 'i3a';
    const CSS_DIR = 'css';
    const LAYOUT_CSS = 'layout.css';
    const STORAGE_KEY = 'blenux-theme';

    const THEMES = [
        { id: 'i3a', label: 'i3' },
        { id: 'style', label: 'Test' },
        { id: '98', label: 'Windows 98' }
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

    function injectStylesheet(id, href) {
        let stylesheet = document.getElementById(id);
        if (!stylesheet) {
            stylesheet = document.createElement('link');
            stylesheet.id = id;
            stylesheet.rel = 'stylesheet';
            stylesheet.type = 'text/css';
            stylesheet.href = href;
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
        const basePath = getCssBasePath();
        // BLX - Layout CSS is shared and never swapped
        injectStylesheet('layout-stylesheet', basePath + LAYOUT_CSS);

        // BLX - Theme CSS is injected and swapped by the dropdown
        const stylesheet = injectStylesheet('theme-stylesheet', basePath + DEFAULT_THEME + '.css');
        const savedTheme = localStorage.getItem(STORAGE_KEY);
        const themeId = (savedTheme && isValidTheme(savedTheme)) ? savedTheme : DEFAULT_THEME;
        setTheme(stylesheet, themeId);
    }

    function initSelect() {
        const stylesheet = document.getElementById('theme-stylesheet');
        if (!stylesheet) return;

        const select = document.getElementById('theme-select');
        if (!select) return;

        // BLX - Build the dropdown from the single THEMES list so options live in one place
        select.innerHTML = '';
        THEMES.forEach(function(theme) {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.label;
            select.appendChild(option);
        });

        select.value = getThemeFromHref(stylesheet.href);

        select.addEventListener('change', function() {
            setTheme(stylesheet, select.value);
        });
    }

    // BLX - Inject stylesheets immediately so the default theme loads without FOUC
    initHead();

    // BLX - Wire up the selector once the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelect);
    } else {
        initSelect();
    }
})();
