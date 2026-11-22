# Casper

A classic theme for [Ghost](http://github.com/tryghost/ghost/), originally the default theme. These days, our default theme is [Source](http://github.com/tryghost/source/)

This is the latest development version of Casper! If you're just looking to download the latest release, head over to the [releases](https://github.com/TryGhost/Casper/releases) page.

&nbsp;

![screenshot-desktop](https://user-images.githubusercontent.com/1418797/183329195-8e8f2ee5-a473-4694-a813-a2575491209e.png)

&nbsp;

# First time using a Ghost theme?

Ghost uses a simple templating language called [Handlebars](http://handlebarsjs.com/) for its themes.

This theme has lots of code comments to help explain what's going on just by reading the code. Once you feel comfortable with how everything works, we also have full [theme API documentation](https://ghost.org/docs/themes/) which explains every possible Handlebars helper and template.

**The main files are:**

- `default.hbs` - The parent template file, which includes your global header/footer
- `index.hbs` - The main template to generate a list of posts, usually the home page
- `post.hbs` - The template used to render individual posts
- `page.hbs` - Used for individual pages
- `tag.hbs` - Used for tag archives, eg. "all posts tagged with `news`"
- `author.hbs` - Used for author archives, eg. "all posts written by Jamie"

One neat trick is that you can also create custom one-off templates by adding the slug of a page to a template file. For example:

- `page-about.hbs` - Custom template for an `/about/` page
- `tag-news.hbs` - Custom template for `/tag/news/` archive
- `author-ali.hbs` - Custom template for `/author/ali/` archive

# Projects

The projects index requires Ghost's `routes.yaml` to define these collections, while preserving any existing routes and taxonomies:

```yaml
collections:
  /projects/:
    permalink: /projects/{slug}/
    template: projects
    filter: tag:hash-project
    order: featured desc, title asc, published_at desc
  /:
    permalink: /{slug}/
    template: index
    filter: tag:-hash-project
```

Tag each project post `#project` and choose the `Project` custom template for full detail pages. Blog posts related to a project should have the internal tag `#project-{projectSlug}`; the detail page lists matching blog posts, and blog posts list matching projects. Project entries are excluded from author pages and both related-content lists. Each related-content list considers at most 100 results, as limited by Ghost.

Each card links to `/projects/{slug}/repo/`, which must be configured in Ghost's redirects to point to that project's repository. Project posts without a custom template are treated as tile-only: their cards link directly to the repository and omit the detail button. Tile-only projects also need a redirect from `/projects/{slug}/` to their repository. The theme alone does not configure routes or redirects; they must be in place before publishing the project posts.

# Training

The theme does not publish or migrate Ghost content. Before enabling the catalogue, merge the following into the site's existing `routes.yaml`, preserving the other routes and taxonomies. The filters are mutually exclusive: a course must not also have `#project`.

```yaml
collections:
  /training/:
    permalink: /training/{slug}/
    template: training
    filter: tag:hash-training
    order: title asc
    data: page.training
    rss: false
  /projects/:
    permalink: /projects/{slug}/
    template: projects
    filter: tag:hash-project+tag:-hash-training
    order: featured desc, title asc, published_at desc
  /:
    permalink: /{slug}/
    template: index
    filter: tag:-hash-project+tag:-hash-training
```

Create a published post for each course, tagged `#training` and exactly one of `#training-github`, `#training-scrum`, `#training-azure`, or `#training-phoenix-project`. The collection paginates normally; category sections show the courses on the current page. Use a code **and** descriptive title in coded-course slugs, for example `gh-200-github-actions`, and select the `Training` custom template for a course with a detail page. Ghost supplies its canonical URL and SEO metadata. The agreed catalogue includes GitHub GH-XXX classes and Microsoft Skills Assessments for GitHub, Scrum.org classes, AZ-900, AI-901, AZ-400, AZ-401, and the GamingWorks Phoenix Project game. Create only entries with confirmed titles and descriptions; this theme does not invent the missing course catalogue.

Every course needs an explicit Ghost redirect from `/training/{slug}/register/` to its confirmed Scrum.org or Xebia registration page, or to the appropriate contact destination when there is no public registration page. Add `#training-contact` for the latter so the link says **Contact**. Until the destination is known, do not publish that entry: the theme cannot determine an external destination from a Ghost post. For a tile-only course leave its custom template unset and also redirect `/training/{slug}/` to the same destination; its card omits the detail link. Configure redirects before publishing so neither registration links nor tile-only URLs lead to missing pages. Redirect existing course URLs, including old AI-900 URLs, to their corresponding new course URL; keep the code and title in the new slug.

Give each related blog post the internal tag `#training-{courseSlug}`, e.g. `#training-gh-200-github-actions`. Both the course detail and ordinary blog post then show the corresponding related content. Project and training entries are excluded from article recommendations. Related queries are limited to 100 courses or articles, as in the projects implementation.

The collection's `data: page.training` loads the existing Ghost page with slug `training` as the editable upcoming-classes area at the top of the first catalogue page. Replace its old content with a heading and a schedule table or list before switching routes. The Scrum.org schedule workflow in `jessehouwing/jessehouwing` can update a dedicated Ghost HTML card in that page's Lexical content, bounded by `<!-- SCRUM-CLASS-LIST:START -->` and `<!-- SCRUM-CLASS-LIST:END -->`; each entry should include the course title, dates, language, location and its actual registration URL. The workflow must preserve the rest of the page and verify that Ghost retains the markers when writing and reading the card. Do not populate static dates in the theme, and remove expired entries during synchronization. Course detail content may separately include upcoming classes where available.

Credential badge links are maintained in `training.hbs` and `partials/mct-credential.hbs`; replace the dated MVP and MCT badge links and images when renewed.

The root collection filter above is required to exclude training from the homepage and its pagination; the theme cannot change Ghost's collection routing. Author archives exclude projects and training, while tag archives exclude training but retain projects. These archives query and paginate their filtered posts independently, including the displayed tag count. Ghost's automatically generated head pagination metadata still reflects its unfiltered taxonomy query, so its `rel="next"` links can lead crawlers to empty filtered pages. Infinite scroll and the visible pagination use the filtered results instead. Ghost does not expose a theme option to replace just these head links; preserving `ghost_head` also preserves its other metadata and injected scripts.

# Social links

The header and footer use the publication accounts configured in Ghost Admin's
Social accounts settings. Author pages use each author's accounts from their
staff profile, not the publication accounts. Only populated accounts are shown.
Existing URLs must be entered in Ghost Admin; the theme does not migrate settings.
GitHub, Sponsors, Stack Overflow, MVP, GitHub Stars, phone, and RSS links remain
unchanged because they are not supported by Ghost's social-account helper.
Rendering these accounts requires a Ghost version with the `social_accounts` helper.

# Development

Casper styles are compiled using Gulp/PostCSS to polyfill future CSS spec. You'll need [Node](https://nodejs.org/), [Yarn](https://yarnpkg.com/) and [Gulp](https://gulpjs.com) installed globally. After that, from the theme's root directory:

```bash
# install dependencies
yarn install

# run development server
yarn dev
```

Now you can edit `/assets/css/` files, which will be compiled to `/assets/built/` automatically.

The `zip` Gulp task packages the theme files into `dist/<theme-name>.zip`, which you can then upload to your site.

```bash
# create .zip file
yarn zip
```

# PostCSS Features Used

- Autoprefixer - Don't worry about writing browser prefixes of any kind, it's all done automatically with support for the latest 2 major versions of every browser.
- [Color Mod](https://github.com/jonathantneal/postcss-color-mod-function)


# SVG Icons

Casper uses inline SVG icons, included via Handlebars partials. You can find all icons inside `/partials/icons`. To use an icon just include the name of the relevant file, eg. To include the SVG icon in `/partials/icons/rss.hbs` - use `{{> "icons/rss"}}`.

You can add your own SVG icons in the same manner.

# Translations

Please see [@TryGhost/Themes/theme-translations/README.md](https://github.com/TryGhost/Themes/blob/main/packages/theme-translations/README.md) for how to build, edit, or contribute translations.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
