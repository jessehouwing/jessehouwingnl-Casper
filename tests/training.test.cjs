const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const Handlebars = require("handlebars");

const root = path.join(__dirname, "..");
const h = Handlebars.create();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

for (const name of ["training-card", "training-feed", "related-posts", "recent-posts"]) {
    h.registerPartial(name, read(`partials/${name}.hbs`));
}
h.registerPartial("post-card", '<div class="post-card">{{title}}</div>');
h.registerPartial("project-card", '<div class="project-card">{{title}}</div>');
h.registerPartial("mct-credential", read("partials/mct-credential.hbs"));
h.registerPartial("icons/fire", "");
h.registerPartial("icons/avatar", "");
h.registerHelper("foreach", function (items, options) {
    const visible = (items || []).filter((item) => options.hash.visibility === "all" || item.visibility !== "internal");
    return visible.map((item, index) => options.fn(item, {
        data: options.data,
        blockParams: Handlebars.Utils.blockParams([item, index], [null, null]),
    })).join("");
});
h.registerHelper("has", function (options) {
    const found = (this.tags || []).some((tag) => tag.name === options.hash.tag);
    return found ? options.fn(this) : options.inverse(this);
});
h.registerHelper("match", function (left, operator, right, options) {
    if (arguments.length === 3) {
        options = right;
        right = operator;
        operator = "=";
    }
    const matched = operator === "!=" ? left !== right : left === right;
    return matched ? options.fn(this) : options.inverse(this);
});
h.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
h.registerHelper("post", function (options) { return options.fn(this); });
h.registerHelper("page", function (options) { return options.fn(this.page); });
h.registerHelper("is", function (context, options) {
    return context === "paged" && options.data.paged ? options.fn(this) : options.inverse(this);
});
h.registerHelper("pagination", () => "");
for (const name of ["post_class", "date", "authors", "reading_time", "t", "comments"]) {
    h.registerHelper(name, () => "");
}
h.registerHelper("img_url", (url) => url || "");

const tag = (name, slug = name.replace(/^#/, "hash-"), visibility = "internal") => ({name, slug, visibility});
const course = (overrides = {}) => ({
    title: "GH-200 GitHub Actions",
    slug: "gh-200-github-actions",
    url: "/training/gh-200-github-actions/",
    custom_template: "training",
    tags: [tag("#training"), tag("#training-github")],
    ...overrides,
});
const data = {site: {url: "https://example.test"}, custom: {show_recent_posts_footer: true}};

test("category feed renders only the current page's matching courses", () => {
    const render = h.compile('{{> "training-feed" category="#training-github"}}');
    const html = render({posts: [course(), course({title: "AZ-900", tags: [tag("#training-azure")]})]}, {data});
    assert.match(html, /GH-200 GitHub Actions/);
    assert.doesNotMatch(html, /AZ-900/);
    assert.match(html, /\/training\/gh-200-github-actions\/register\//);
    assert.match(html, /View course/);
});

test("tile-only contact courses link directly to the configured redirect", () => {
    const render = h.compile('{{> "training-card"}}');
    const html = render(course({custom_template: null, tags: [tag("#training-contact")]}), {data});
    assert.doesNotMatch(html, /View course|>Register</);
    assert.match(html, /\/training\/gh-200-github-actions\/register\/">Contact/);
});

test("the schedule appears only on the first catalogue page", () => {
    const render = h.compile(read("training.hbs"));
    const context = {page: {content: "Upcoming classes"}, posts: [course()]};
    assert.match(render(context, {data}), /Upcoming classes/);
    assert.doesNotMatch(render(context, {data: {...data, paged: true}}), /Upcoming classes/);
});

test("blog recommendations precede matching projects and courses; internal tags only", () => {
    const render = h.compile(read("post.hbs"));
    const article = {
        id: "article-id",
        title: "Article",
        tags: [
            tag("#project-tool"),
            tag("#training-gh-200-github-actions"),
            tag("training-other", "hash-training-other", "public"),
        ],
        primary_tag: {slug: "github"},
    };
    h.registerHelper("get", function (resource, options) {
        let results;
        if (options.hash.filter === "tag:hash-project") {
            results = [{slug: "tool", title: "Project"}];
        } else if (options.hash.filter === "tag:hash-training") {
            results = [course(), course({slug: "other", title: "Unrelated"})];
        } else {
            assert.match(options.hash.filter, /tag:-hash-project\+tag:-hash-training/);
            results = [{title: "Related article"}];
        }
        return options.fn({posts: results}, {
            data: options.data,
            blockParams: Handlebars.Utils.blockParams([results], [null]),
        });
    });
    const html = render(article, {data});
    assert.ok(html.indexOf("Related posts") < html.indexOf("Related projects"));
    assert.ok(html.indexOf("Related projects") < html.indexOf("Related training"));
    assert.match(html, /Related article/);
    assert.match(html, /GH-200 GitHub Actions/);
    assert.doesNotMatch(html, /Unrelated/);
});

test("recent-post fallback retains the current article id", () => {
    const render = h.compile(read("post.hbs"));
    let sawFallback = false;
    h.registerHelper("get", function (resource, options) {
        let results = [];
        if (options.hash.filter.startsWith("id:-{{article_id}}")) {
            assert.equal(this.article_id, "article-id");
            sawFallback = true;
            results = [{title: "Recent article"}];
        }
        return options.fn({posts: results}, {
            data: options.data,
            blockParams: Handlebars.Utils.blockParams([results], [null]),
        });
    });
    const html = render({id: "article-id", title: "Article", tags: [], primary_tag: {slug: "github"}}, {data});
    assert.ok(sawFallback);
    assert.match(html, /Recent posts/);
    assert.match(html, /Recent article/);
});

test("course detail related articles exclude course and project entries", () => {
    const render = h.compile(read("custom-training.hbs"));
    h.registerHelper("get", function (resource, options) {
        assert.equal(options.hash.filter, "tag:hash-training-{{slug}}+tag:-hash-training+tag:-hash-project");
        const results = [{title: "A related article"}];
        return options.fn({posts: results}, {
            data: options.data,
            blockParams: Handlebars.Utils.blockParams([results], [null]),
        });
    });
    const html = render(course({
        feature_image: "https://example.test/course-badge.png",
        feature_image_alt: "GitHub Actions certification badge",
    }), {data});
    assert.match(html, /A related article/);
    assert.match(html, /<h1 class="article-title">GH-200 GitHub Actions<\/h1>/);
    assert.match(html, /class="training-course-badge"/);
    assert.match(html, /src="https:\/\/example\.test\/course-badge\.png"/);
    assert.match(html, /alt="GitHub Actions certification badge"/);
    assert.doesNotMatch(html, /class="article-image"/);
});

test("course details render without a feature-image badge", () => {
    const render = h.compile(read("custom-training.hbs"));
    h.registerHelper("get", function (resource, options) {
        const results = [{title: "A related article"}];
        return options.fn({posts: results}, {
            data: options.data,
            blockParams: Handlebars.Utils.blockParams([results], [null]),
        });
    });
    const html = render(course({feature_image: null}), {data});
    assert.match(html, /<h1 class="article-title">GH-200 GitHub Actions<\/h1>/);
    assert.doesNotMatch(html, /training-course-badge|class="article-image"/);
});
