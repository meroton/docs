// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Meroton",
  tagline: "Speed up your builds",
  url: "https://meroton.github.io",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.svg",
  deploymentBranch: "main",
  organizationName: "meroton", // Usually your GitHub org/user name.
  projectName: "meroton.github.io", // Usually your repo name.
  trailingSlash: true,
  presets: [
    [
      "@docusaurus/preset-classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/meroton/docs/edit/main/",
        },
        blog: {
          path: "blog",
          // Simple use-case: string editUrl
          // editUrl: 'https://github.com/facebook/docusaurus/edit/main/website/',
          // Advanced use-case: functional editUrl
          editUrl: `https://github.com/meroton/docs/edit/main/`,
          editLocalizedFiles: false,
          blogTitle: "Meroton Blog",
          blogDescription:
            "Free form articles describing technical issues, solutions and news from meroton",
          blogSidebarCount: 5,
          blogSidebarTitle: "All articles",
          routeBasePath: "blog",
          include: ["**/*.{md,mdx}"],
          exclude: [
            "**/_*.{js,jsx,ts,tsx,md,mdx}",
            "**/_*/**",
            "**/*.test.{js,jsx,ts,tsx}",
            "**/__tests__/**",
          ],
          postsPerPage: 10,
          blogListComponent: "@theme/BlogListPage",
          blogPostComponent: "@theme/BlogPostPage",
          blogTagsListComponent: "@theme/BlogTagsListPage",
          blogTagsPostsComponent: "@theme/BlogTagsPostsPage",
          truncateMarker: /<!--s*(truncate)s*-->/,
          showReadingTime: true,
          feedOptions: {
            type: "all",
            title: "",
            description: "",
            copyright: "",
            language: undefined,
          },
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],
  plugins: [
    [
      "@docusaurus/plugin-google-gtag",
      {
        trackingID: "G-LVF8V72WEQ",
        anonymizeIP: true,
      },
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "Meroton",
        logo: {
          alt: "Meroton",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "doc",
            docId: "intro",
            position: "left",
            label: "Documentation",
          },
          {
            label: "Services",
            to: "/services",
          },
          {
            label: "Blog",
            to: "/blog",
          },
          {
            href: "https://forms.gle/wchwDu6roWg6A7U29",
            label: "Sign up",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Introduction",
                to: "/docs/intro",
              },
              {
                label: "Theory",
                to: "/docs/theory/components-of-a-build",
              },
            ],
          },
          {
            title: "About Us",
            items: [
              { label: "Services", to: "/services" },
              { label: "Contact", to: "/contact" },
              { label: "Sign up", href: "https://forms.gle/wchwDu6roWg6A7U29" },
            ],
          },
          {
            title: "Hosted build system",
            items: [
              {
                label: "Self hosted",
                to: "/services/self-hosted",
              },
              {
                label: "Cloud based",
                to: "/services/cloud-environment",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Blog",
                to: "/blog",
              },
              {
                label: "Bug bounty",
                to: "/bug-bounty",
              },
              {
                label: "GitHub",
                href: "https://github.com/meroton",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Meroton AB`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
