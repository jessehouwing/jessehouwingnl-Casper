(function () {
    const mediaQuery = window.matchMedia('(max-width: 800px)');

    const head = document.querySelector('.gh-head');
    const menu = head.querySelector('.gh-head-menu');
    const nav = menu.querySelector('.nav');
    if (!nav) return;

    const logo = document.querySelector('.gh-head-logo');
    const navHTML = nav.innerHTML;

    if (mediaQuery.matches) {
        const items = nav.querySelectorAll('li');
        items.forEach(function (item, index) {
            item.style.transitionDelay = 0.03 * (index + 1) + 's';
        });
    }

    var windowClickListener;
    const makeDropdown = function () {
        if (mediaQuery.matches) return;
        const submenuItems = [];

        // Read all dimensions first (single layout calculation)
        const menuWidth = menu.offsetWidth;
        const items = Array.from(nav.children);
        const itemWidths = items.map(function(item) {
            return item.offsetWidth;
        });
        
        // Calculate which items need to move (no DOM changes yet)
        const availableWidth = menuWidth - 64;
        let totalWidth = 0;
        let overflowIndex = -1;
        
        for (let i = 0; i < itemWidths.length; i++) {
            totalWidth += itemWidths[i];
            if (totalWidth > availableWidth && overflowIndex === -1) {
                overflowIndex = i;
            }
        }
        
        // Now batch all DOM changes
        if (overflowIndex !== -1) {
            for (let i = items.length - 1; i >= overflowIndex; i--) {
                submenuItems.unshift(items[i]);
                items[i].remove();
            }
        }

        if (!submenuItems.length) {
            document.body.classList.add('is-dropdown-loaded');
            return;
        }

        const toggle = document.createElement('button');
        toggle.setAttribute('class', 'nav-more-toggle');
        toggle.setAttribute('aria-label', 'More');
        toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M21.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0zM13.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0zM5.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0z"></path></svg>';

        const wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'gh-dropdown');

        if (submenuItems.length >= 10) {
            document.body.classList.add('is-dropdown-mega');
            wrapper.style.gridTemplateRows = 'repeat(' + Math.ceil(submenuItems.length / 2) + ', 1fr)';
        } else {
            document.body.classList.remove('is-dropdown-mega');
        }

        submenuItems.forEach(function (child) {
            wrapper.appendChild(child);
        });

        toggle.appendChild(wrapper);
        nav.appendChild(toggle);

        document.body.classList.add('is-dropdown-loaded');

        toggle.addEventListener('click', function () {
            document.body.classList.toggle('is-dropdown-open');
        });

        windowClickListener = function (e) {
            if (!toggle.contains(e.target) && document.body.classList.contains('is-dropdown-open')) {
                document.body.classList.remove('is-dropdown-open');
            }
        };
        window.addEventListener('click', windowClickListener);
    }

    imagesLoaded(head, function () {
        makeDropdown();
    });

    window.addEventListener('resize', function () {
        setTimeout(function () {
            window.removeEventListener('click', windowClickListener);
            nav.innerHTML = navHTML;
            makeDropdown();
        }, 1);
    });
})();
