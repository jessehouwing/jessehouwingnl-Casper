const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const Handlebars = require("handlebars");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const h = Handlebars.create();
h.registerPartial("icons/github", read("partials/icons/github.hbs"));
h.registerPartial("post-card", "");
h.registerHelper("post", function (options) { return options.fn(this); });
h.registerHelper("post_class", () => "");
h.registerHelper("tags", () => new Handlebars.SafeString('<a href="/tag/tools/">Tools</a>'));
h.registerHelper("get", function (resource, options) {
    const posts = [];
    return options.fn({posts}, {data: options.data, blockParams: Handlebars.Utils.blockParams([posts], [null])});
});

const project = {title: "Example project", slug: "example", url: "/projects/example/", custom_template: "project"};
const data = {site: {url: "https://example.test"}};

test("project cards place tags after the title and retain the repository link", () => {
    const html = h.compile(read("partials/project-card.hbs"))(project, {data});
    assert.ok(html.indexOf("Example project") < html.indexOf('<a href="/tag/tools/">Tools</a>'));
    assert.match(html, /href="https:\/\/example\.test\/projects\/example\/repo\/"><svg[^>]*aria-hidden="true"[^]*?<\/svg> View repository<\/a>/);
});

test("project details retain the repository link and its accessible label", () => {
    const html = h.compile(read("custom-project.hbs"))(project, {data});
    assert.match(html, /href="https:\/\/example\.test\/projects\/example\/repo\/"><svg[^>]*aria-hidden="true"[^]*?<\/svg> View repository<\/a>/);
});
