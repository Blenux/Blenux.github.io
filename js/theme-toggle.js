// BLX - Theme selector script: lets the user explicitly choose a theme from a dropdown
// Stores the user's preference in localStorage

(function() {
    const STORAGE_KEY = 'blenux-theme';

    const THEMES = [
        { id: 'style', label: 'Default' },
        { id: 'i3a', label: 'i3' }
    ];

    function isValidTheme(themeId) {
        return THEMES.some(function(theme) {
            return theme.id === themeId;
        });
    }

    function getThemeFromHref(href) {
        const match = href.match(/\/css\/([^/]+)\.css(?:\?.*)?$/);
        if (match) {
            const filename = match[1];
            if (isValidTheme(filename)) {
                return filename;
            }
        }
        return THEMES[0].id;
    }

    function getBasePathFromHref(href) {
        const match = href.match(/(.*\/css\/)((?:[^/]+)\.css(?:\?.*)?)$/);
        return match ? match[1] : 'css/';
    }

    function setTheme(stylesheet, themeId) {
        const basePath = getBasePathFromHref(stylesheet.href);
        stylesheet.href = basePath + themeId + '.css';
        localStorage.setItem(STORAGE_KEY, themeId);

        const select = document.getElementById('theme-select');
        if (select) {
            select.value = themeId;
        }
    }

    function init() {
        const stylesheet = document.getElementById('theme-stylesheet');
        if (!stylesheet) return;

        const select = document.getElementById('theme-select');
        if (!select) return;

        const currentTheme = getThemeFromHref(stylesheet.href);
        const savedTheme = localStorage.getItem(STORAGE_KEY);

        // BLX - Apply saved preference if valid and different from current stylesheet
        if (savedTheme && savedTheme !== currentTheme && isValidTheme(savedTheme)) {
            setTheme(stylesheet, savedTheme);
        } else {
            select.value = currentTheme;
        }

        // BLX - Wire up the theme selector
        select.addEventListener('change', function() {
            setTheme(stylesheet, select.value);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
