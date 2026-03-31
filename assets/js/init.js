// Initialize mobile menu and responsive videos
// This runs after all scripts load (including jQuery) since casper.js is deferred
(function() {
    // Mobile Menu Trigger
    var burger = document.querySelector('.gh-burger');
    if (burger) {
        burger.addEventListener('click', function() {
            document.body.classList.toggle('gh-head-open');
        });
    }

    // FitVids - Makes video embeds responsive (requires jQuery)
    if (typeof jQuery !== 'undefined') {
        jQuery('.gh-content').fitVids();
    }
})();
