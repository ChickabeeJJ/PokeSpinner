// Tailwind scans the markup and every game script for class names.
// After adding new utility classes, run `npm run build:css` and commit css/tailwind.css.
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: { extend: {} },
};
