const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const Handlebars = require("handlebars");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const h = Handlebars.create();
for (const name of ["jesse-social-links", "social-links"]) {
    h.registerPartial(name, read(`partials/${name}.hbs`));
}
for (const name of ["heart", "github", "stackoverflow", "mvp", "githubstars", "phone", "rss", "twitter", "facebook", "linkedin", "bluesky", "threads", "mastodon", "instagram"]) {
    h.registerPartial(`icons/${name}`, `<svg aria-hidden="true" data-icon="${name}"></svg>`);
}
h.registerHelper("social_accounts", function (source, options) {
    return source.accounts.map(account => options.fn(account)).join("");
});
h.registerHelper("match", function (left, operator, right, options) {
    if (!options) {
        options = right;
        right = operator;
        operator = "=";
    }
    return (operator === "!=" ? left !== right : left === right) ? options.fn(this) : options.inverse(this);
});
h.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
h.registerHelper("get", function (resource, options) {
    return options.fn({posts: [], pagination: {page: 1, pages: 1}}, {data: options.data});
});
h.registerHelper("foreach", () => "");
h.registerHelper("pagination", () => "");
h.registerHelper("t", text => text);
h.registerHelper("page_url", () => "/");

const site = {
    url: "https://example.test",
    accounts: ["x", "facebook", "linkedin", "bluesky", "threads", "mastodon", "instagram"].map(type => ({
        type, name: type, href: `https://example.test/${type}`,
    })),
};
const data = {site, config: {posts_per_page: 25}};
const links = html => [...html.matchAll(/<a class="[^"]*" href="([^"]*)"[^>]*aria-label="([^"]+)"/g)]
    .map(([, href, label]) => ({href, label}));

test("Jesse's author links match the header without duplicated author accounts", () => {
    let authorLinks;
    h.registerHelper("contentFor", function (name, options) {
        authorLinks = options.fn(this, {data: options.data});
        return "";
    });
    h.compile(read("author-jesse-houwing.hbs"))({}, {data});
    h.registerHelper("block", () => new h.SafeString(authorLinks));
    const author = {slug: "jesse-houwing", website: "https://example.test/", accounts: site.accounts};
    const html = h.compile(read("author.hbs"))({author, pagination: {page: 1}}, {data});
    const header = h.compile('{{> "jesse-social-links" link_class="gh-social-link"}}')({}, {data});
    assert.deepEqual(links(html), links(header));
    assert.equal(links(html).length, 14);
    assert.match(read("default.hbs"), /{{> "jesse-social-links" link_class="gh-social-link"}}/);
    assert.match(html, /class="author-profile-social-link author-profile-website"/);
});

test("other authors retain their own social accounts", () => {
    h.registerHelper("block", () => "");
    const author = {slug: "another-author", accounts: [site.accounts[0]]};
    const html = h.compile(read("author.hbs"))({author, pagination: {page: 1}}, {data});
    assert.deepEqual(links(html), [{href: "https://example.test/x", label: "x"}]);
});
