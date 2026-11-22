const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createRequire} = require('node:module');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const authorTemplate = fs.readFileSync(path.join(root, 'author.hbs'), 'utf8');
const infiniteScroll = fs.readFileSync(path.join(root, 'assets', 'js', 'infinite-scroll.js'), 'utf8');
const Handlebars = createRequire(require.resolve('gscan/package.json'))('handlebars');

const projects = Array.from({length: 20}, (_, index) => ({
    slug: `project-${index}`,
    title: `Project ${index}`,
    authors: ['jesse'],
    tags: ['hash-project']
}));
const articles = Array.from({length: 30}, (_, index) => ({
    slug: `article-${index}`,
    title: `Article ${index}`,
    authors: ['jesse'],
    tags: []
}));
const entries = [
    ...projects,
    ...articles,
    {slug: 'coauthored', title: 'Coauthored', authors: ['another', 'jesse'], tags: []},
    {slug: 'another-author', title: 'Another author', authors: ['another'], tags: []}
];

function renderAuthor({page = 1, posts = entries, fail = false} = {}) {
    const hbs = Handlebars.create();
    const pageUrl = (number) => number === 1 ? '/author/jesse/' : `/author/jesse/page/${number}/`;

    hbs.registerPartial('post-card', '<article class="post-card" data-slug="{{slug}}">{{title}}</article>');
    hbs.registerPartial('social-links', '');
    hbs.registerHelper('block', () => '');
    hbs.registerHelper('page_url', pageUrl);
    hbs.registerHelper('t', (text) => text);
    hbs.registerHelper('match', function (left, operator, right, options) {
        assert.equal(operator, '>');
        return left > right ? options.fn(this) : options.inverse(this);
    });
    hbs.registerHelper('foreach', function (items, options) {
        return items.length ? items.map((item) => options.fn(item)).join('') : options.inverse(this);
    });
    hbs.registerHelper('pagination', function () {
        const next = this.pagination.next;
        return new hbs.SafeString(
            `<nav class="pagination">${next ? `<a class="older-posts" href="${pageUrl(next)}">Older</a>` : ''}</nav>`
        );
    });
    hbs.registerHelper('get', function (resource, options) {
        assert.equal(resource, 'posts');
        if (fail) {
            return options.inverse(this, {data: options.data});
        }

        const filter = (options.hash.filter || '').replaceAll('{{slug}}', this.slug);
        const clauses = filter.split('+').filter(Boolean);
        const filtered = posts.filter((post) => clauses.every((clause) => {
            if (clause.startsWith('authors:')) {
                return post.authors.includes(clause.slice('authors:'.length));
            }
            if (clause.startsWith('tag:-')) {
                return !post.tags.includes(clause.slice('tag:-'.length));
            }
            throw new Error(`Unsupported filter clause: ${clause}`);
        }));
        const limit = Number(options.hash.limit || 15);
        const currentPage = Number(options.hash.page || 1);
        const pages = Math.max(1, Math.ceil(filtered.length / limit));
        const pagination = {
            page: currentPage,
            limit,
            pages,
            total: filtered.length,
            prev: currentPage === 1 ? null : currentPage - 1,
            next: currentPage === pages ? null : currentPage + 1
        };
        const start = (currentPage - 1) * limit;
        return options.fn({posts: filtered.slice(start, start + limit), pagination}, {data: options.data});
    });

    return hbs.compile(authorTemplate)(
        {author: {slug: 'jesse', name: 'Jesse'}, pagination: {page}},
        {data: {config: {posts_per_page: 25}}}
    );
}

function cards(html) {
    return Array.from(html.matchAll(/<article class="post-card" data-slug="([^"]+)"/g), (match) => match[1]);
}

test('author archives paginate articles without projects or other authors', () => {
    const first = renderAuthor();
    const second = renderAuthor({page: 2});

    assert.match(first, /Jesse/);
    assert.deepEqual(cards(first), articles.slice(0, 25).map((post) => post.slug));
    assert.deepEqual(cards(second), [...articles.slice(25).map((post) => post.slug), 'coauthored']);
    assert.match(first, /class="older-posts" href="\/author\/jesse\/page\/2\/"/);
    assert.doesNotMatch(second, /class="older-posts"/);
});

test('empty and stale author pages do not navigate to nonexistent filtered pages', () => {
    const empty = renderAuthor({posts: projects});
    const stale = renderAuthor({page: 3});

    assert.match(empty, /Jesse/);
    assert.deepEqual(cards(empty), []);
    assert.doesNotMatch(empty, /class="older-posts"/);
    assert.deepEqual(cards(stale), []);
    assert.match(stale, /There are no posts on this page/);
    assert.match(stale, /href="\/author\/jesse\/page\/2\/"/);
    assert.doesNotMatch(stale, /class="older-posts"/);
});

test('author archive reports a failed post query', () => {
    assert.match(renderAuthor({fail: true}), /Posts could not be loaded/);
});

function setupInfiniteScroll({author, headNext, pageNext}) {
    const listeners = new Map();
    const frames = [];
    const requests = [];
    const feed = {children: [], appendChild(item) { this.children.push(item); }};
    const headLink = headNext ? {href: headNext} : null;
    const pageLink = pageNext ? {href: pageNext} : null;

    class Request {
        addEventListener(name, callback) {
            this[name] = callback;
        }
        open(method, url) {
            this.method = method;
            this.url = url;
        }
        send() {
            requests.push(this);
        }
        respond({head, pagination, articles: results = []}) {
            this.status = 200;
            this.response = {
                querySelectorAll: () => results,
                querySelector: (selector) => {
                    if (selector === 'link[rel=next]') return head ? {href: head} : null;
                    if (selector === '.pagination .older-posts') return pagination ? {href: pagination} : null;
                    return null;
                }
            };
            this.load.call(this);
        }
    }

    const document = {
        documentElement: {classList: {contains: () => false}, scrollHeight: 1000},
        body: {classList: {contains: (name) => name === 'author-template' && author}},
        querySelector(selector) {
            if (selector === 'link[rel=next]') return headLink;
            if (selector === '.pagination .older-posts') return pageLink;
            if (selector === '.post-feed') return feed;
            return null;
        },
        importNode: (item) => item
    };
    const window = {
        scrollY: 800,
        innerHeight: 700,
        XMLHttpRequest: Request,
        requestAnimationFrame: (callback) => frames.push(callback),
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: (name) => listeners.delete(name)
    };
    vm.runInNewContext(infiniteScroll, {window, document});

    return {
        feed,
        frames,
        listeners,
        requests,
        scroll() {
            if (listeners.has('scroll')) listeners.get('scroll')();
        },
        flush() {
            assert.ok(frames.length);
            frames.shift()();
        }
    };
}

test('author infinite scroll stops when filtered pagination has no next page', () => {
    const scroll = setupInfiniteScroll({author: true, headNext: '/unfiltered-next', pageNext: null});

    assert.equal(scroll.frames.length, 0);
    assert.equal(scroll.listeners.has('scroll'), false);
    assert.equal(scroll.requests.length, 0);
});

test('author infinite scroll follows the filtered next link on each page', () => {
    const scroll = setupInfiniteScroll({author: true, headNext: '/unfiltered-2', pageNext: '/filtered-2'});

    scroll.flush();
    assert.equal(scroll.requests[0].url, '/filtered-2');
    scroll.requests[0].respond({head: '/unfiltered-3', pagination: '/filtered-3', articles: ['article-1']});
    scroll.scroll();
    scroll.flush();
    assert.equal(scroll.requests[1].url, '/filtered-3');
    scroll.requests[1].respond({head: '/unfiltered-4', pagination: null, articles: ['article-2']});

    assert.deepEqual(scroll.feed.children, ['article-1', 'article-2']);
    assert.equal(scroll.listeners.has('scroll'), false);
    assert.equal(scroll.requests.length, 2);
});

test('non-author infinite scroll still follows Ghost head links', () => {
    const scroll = setupInfiniteScroll({author: false, headNext: '/head-next', pageNext: '/other-next'});

    scroll.flush();
    assert.equal(scroll.requests[0].url, '/head-next');
    scroll.requests[0].respond({head: null, pagination: '/other-next'});
    assert.equal(scroll.listeners.has('scroll'), false);
});
