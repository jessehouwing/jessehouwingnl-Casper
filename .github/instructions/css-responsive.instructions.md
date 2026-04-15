---
applyTo: 'assets/css/**/*.css'
---

# CSS Responsive Design Guidelines

When editing `assets/css/*.css` files:

- **Always consider multiple viewport widths** when making layout or spacing changes
- Check common breakpoints: 1200px, 991px, 767px, 480px
- After fixing a responsive issue at one size, **proactively ask** whether similar fixes are needed at other breakpoints
- Watch for layout shifts caused by flex-wrap, gap changes, or max-width constraints
- Test overflow behavior for navigation, social icons, and other multi-item containers
