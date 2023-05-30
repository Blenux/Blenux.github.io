// script.js

var toggleButton = document.getElementById('toggle-button');
var themeStyle = document.getElementById('theme-style');

// Check if a theme preference is stored in local storage
var selectedTheme = localStorage.getItem('theme');
if (selectedTheme) {
  themeStyle.setAttribute('href', selectedTheme);
}

toggleButton.addEventListener('click', function() {
  var currentTheme = themeStyle.getAttribute('href');
  var newTheme = currentTheme === 'light.css' ? 'dark.css' : 'light.css';

  themeStyle.setAttribute('href', newTheme);

  // Store the selected theme in local storage
  localStorage.setItem('theme', newTheme);
});
