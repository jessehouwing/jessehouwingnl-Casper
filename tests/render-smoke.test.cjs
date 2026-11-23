const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const Handlebars = require("handlebars");
const {knownHelpers} = require("gscan/lib/specs/v6");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const pagination = {page: 1, pages: 1, total: 1};
const account = type => ({type, name: type, href: `https://example.test/${type}`});
const site = {
    title: "Example publication", url: "https://example.test", locale: "en",
    description: "Example description", cover_image: "/cover.jpg", members_enabled: true,
    comments_enabled: true, accounts: [account("x"), account("github"), account("unknown")],
};
const author = {
    name: "Example Author", slug: "example-author", url: "/author/example/",
    bio: "Example biography", website: "https://example.test", profile_image: "/author.jpg",
    cover_image: "/author-cover.jpg", accounts: [account("linkedin")],
};
const tag = {name: "Example tag", slug: "example", url: "/tag/example/", description: "Example tag description", feature_image: "/tag.jpg"};
const post = {
    id: "example-id", title: "Example article", slug: "example", url: "/example/",
    content: "<p>Example article content</p>", excerpt: "Example excerpt",
    custom_excerpt: "Example custom excerpt", feature_image: "/feature.jpg",
    featured: true, access: true, visibility: "public", reading_time: 2,
    primary_tag: tag, tags: [tag, {name: "#training-github", slug: "hash-training-github", visibility: "internal"}],
    authors: [author], comments: true, custom_template: "training",
};
const data = {
    site, config: {posts_per_page: 25}, page: {show_title_and_feature_image: true},
    custom: {
        navigation_layout: "Logo on cover", header_style: "Center aligned",
        show_publication_cover: true, feed_layout: "Classic", color_scheme: "Light",
        post_image_style: "Wide", show_recent_posts_footer: true, email_signup_text: "Subscribe",
    },
};
const archive = {posts: [post], pagination, author, tag, page: post, statusCode: 404, message: "Not found"};
const fixtures = {
    "default": [archive, "Example publication"],
    "index": [archive, "Example article"],
    "post": [post, "Example article content"],
    "page": [post, "Example article content"],
    "author": [archive, "Example Author"],
    "author-jesse-houwing": [{...archive, author: {...author, slug: "jesse-houwing"}}, "Example Author"],
    "author-michael": [archive, "Example Author"],
    "author-sofie-wisse": [archive, "Example Author"],
    "tag": [archive, "Example tag"],
    "projects": [archive, "Example article"],
    "training": [archive, "Example article"],
    "custom-project": [post, "Example article"],
    "custom-training": [post, "Example article"],
    "error-404": [archive, "Not found"],
    "error": [{...archive, statusCode: 500, message: "Server error", errorDetails: [{rule: "Example rule", failures: [{ref: "example.hbs", message: "Example failure"}]}]}, "Example failure"],
};

function partialFiles(directory = "partials") {
    return fs.readdirSync(path.join(root, directory), {withFileTypes: true}).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? partialFiles(file) : file.endsWith(".hbs") ? [file] : [];
    });
}

function renderer({transform = source => source, omittedPartial} = {}) {
    const h = Handlebars.create();
    const blocks = {};
    for (const file of partialFiles()) {
        const name = file.slice("partials".length + 1, -4).replace(/\\/g, "/");
        const source = transform(read(file), file);
        h.precompile(source);
        if (name !== omittedPartial) {
            h.registerPartial(name, source);
        }
    }

    h.registerHelper("link_class", function (options) {
        if (!options.hash.for) {
            throw new Error("The link_class helper requires a for attribute");
        }
        return "";
    });
    h.registerHelper("contentFor", function (name, options) {
        blocks[name] = options.fn(this, {data: options.data});
        return "";
    });
    h.registerHelper("block", name => new h.SafeString(blocks[name] || ""));
    h.registerHelper("post", function (options) { return options.fn(this, {data: options.data}); });
    h.registerHelper("foreach", function (items, options) {
        return (items || []).map((item, index) => {
            const child = h.createFrame(options.data);
            child.index = index;
            return options.fn(item, {data: child, blockParams: h.Utils.blockParams([item, index], [null, null])});
        }).join("") || options.inverse(this);
    });
    h.registerHelper("social_accounts", function (source, options) {
        return (source?.accounts || []).map(item => options.fn(item, {data: options.data})).join("");
    });
    h.registerHelper("get", function (resource, options) {
        assert.equal(resource, "posts");
        const posts = [post];
        return options.fn({posts, pagination}, {
            data: options.data, blockParams: h.Utils.blockParams([posts], [null]),
        });
    });
    h.registerHelper("match", function (...args) {
        const options = args.pop();
        const [left, middle, right] = args;
        const matched = args.length === 1 ? !!left : args.length === 2 ? left === middle :
            middle === "!=" ? left !== right : middle === ">" ? left > right : left === right;
        return (matched ? options.fn : options.inverse)(this, {data: options.data});
    });
    h.registerHelper("has", function (options) {
        const matched = options.hash.tag ? (this.tags || []).some(item => item.name === options.hash.tag) :
            options.hash.index ? String(options.hash.index).split(",").includes(String(options.data.index)) :
                options.hash.visibility ? this.visibility === options.hash.visibility : false;
        return (matched ? options.fn : options.inverse)(this, {data: options.data});
    });
    h.registerHelper("is", function (contexts, options) {
        const matched = contexts.split(",").map(value => value.trim()).includes(options.data.context);
        return (matched ? options.fn : options.inverse)(this, {data: options.data});
    });
    h.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
    h.registerHelper("asset", value => `/assets/${value}`);
    h.registerHelper("img_url", value => value || "");
    h.registerHelper("t", value => value);
    h.registerHelper("page_url", page => `/page/${page}/`);
    h.registerHelper("plural", (value, options) => value === 1 ? options.hash.singular : options.hash.plural);
    h.registerHelper("content", function () { return new h.SafeString(this.content || ""); });
    h.registerHelper("title", function () { return this.title || ""; });
    h.registerHelper("url", function () { return this.url || ""; });
    h.registerHelper("excerpt", function () { return this.excerpt || ""; });
    h.registerHelper("author", function (options) {
        return options.fn(this.author || this, {data: options.data});
    });
    for (const name of ["meta_title", "body_class", "post_class", "ghost_head", "ghost_foot", "navigation", "pagination", "date", "authors", "tags", "reading_time", "comment_count", "comments"]) {
        h.registerHelper(name, () => "");
    }
    for (const name of knownHelpers) {
        if (!Object.hasOwn(h.helpers, name)) {
            h.registerHelper(name, () => { throw new Error(`Ghost helper ${name} needs a smoke-test implementation`); });
        }
    }

    function render(name, context, seen = new Set(), requestContext = name) {
        assert.ok(!seen.has(name), `Circular template inheritance: ${name}`);
        seen.add(name);
        const file = `${name}.hbs`;
        const source = transform(read(file), file);
        h.precompile(source);
        const parent = source.match(/^\s*\{\{!<\s*([\w-]+)\s*\}\}/)?.[1];
        const html = h.compile(source)(context, {data: {...data, context: requestContext}});
        return parent ? render(parent, {...context, body: html}, seen, requestContext) : html;
    }
    return {render, h};
}

function assertNoReservedPartialHashes(source, file) {
    class PartialHashVisitor extends Handlebars.Visitor {
        PartialStatement(node) {
            for (const pair of node.hash?.pairs || []) {
                assert.ok(!knownHelpers.includes(pair.key), `${file}: partial parameter ${pair.key} shadows a Ghost helper`);
            }
            super.PartialStatement(node);
        }
        PartialBlockStatement(node) {
            for (const pair of node.hash?.pairs || []) {
                assert.ok(!knownHelpers.includes(pair.key), `${file}: partial parameter ${pair.key} shadows a Ghost helper`);
            }
            super.PartialBlockStatement(node);
        }
    }
    new PartialHashVisitor().accept(Handlebars.parse(source));
}

test("every top-level template has a representative render fixture", () => {
    const templates = fs.readdirSync(root).filter(file => file.endsWith(".hbs")).map(file => file.slice(0, -4)).sort();
    assert.deepEqual(templates, Object.keys(fixtures).sort());
});

test("partial parameters do not shadow Ghost helpers", () => {
    const files = [...fs.readdirSync(root).filter(file => file.endsWith(".hbs")), ...partialFiles()];
    for (const file of files) assertNoReservedPartialHashes(read(file), file);
    assert.throws(() => assertNoReservedPartialHashes('{{> "social-links" link_class="x"}}', "fixture"), /shadows a Ghost helper/);
});

for (const [name, [context, expected]] of Object.entries(fixtures)) {
    test(`render ${name}.hbs with its real partials and layout`, () => {
        const html = renderer().render(name, context);
        assert.match(html, /<!DOCTYPE html>/i);
        assert.ok(html.includes(expected), `${name} did not render its fixture`);
        assert.match(html, /<\/html>/i);
    });
}

test("missing templates and partials fail instead of being silently ignored", () => {
    assert.throws(() => renderer().render("missing-template", archive), /ENOENT/);
    assert.throws(() => renderer({omittedPartial: "jesse-social-links"}).render("index", archive), /partial .*jesse-social-links.* could not be found/i);
});

test("Ghost link_class requires its for attribute and accepts valid use", () => {
    const {h} = renderer();
    assert.throws(() => h.compile("{{link_class}}")({}), /link_class helper requires a for attribute/);
    assert.doesNotThrow(() => h.compile('{{link_class for="nav"}}')({}));
});

test("reversing the #316 rename in memory makes the smoke render fail", () => {
    const transform = source => source.replace(/social_link_class/g, "link_class");
    assert.throws(() => renderer({transform}).render("index", archive), /link_class helper requires a for attribute/);
});
