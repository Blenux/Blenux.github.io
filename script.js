// script.js

var toggleButton = document.getElementById('toggle-button');
var themeStyle = document.getElementById('theme-style');

// Check if a theme preference is stored in local storage
var selectedTheme = localStorage.getItem('theme');

if (selectedTheme === 'dark.css') {
  // If the last selected theme was dark, set it as the current theme
  themeStyle.setAttribute('href', 'dark.css');
} else {
  // Otherwise, set the default theme (light.css)
  themeStyle.setAttribute('href', 'light.css');
}

toggleButton.addEventListener('click', function() {
  var currentTheme = themeStyle.getAttribute('href');
  var newTheme = currentTheme === 'light.css' ? 'dark.css' : 'light.css';

  themeStyle.setAttribute('href', newTheme);

  // Store the selected theme in local storage
  localStorage.setItem('theme', newTheme);
});
