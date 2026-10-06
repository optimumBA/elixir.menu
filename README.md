# elixir.menu

Tools for your Elixir app. An independent guide by [Optimum Tech](https://optimum.ba/).

Start with one of seven application types, explore a preferred Phoenix + LiveView web stack, and choose optional libraries by feature. Each recommendation explains its reasons and limits.

## Read the guide

- [Website](https://elixir.menu/)
- [Application guide](https://elixir.menu/app-guide.md)
- [Phoenix setup recipe](https://elixir.menu/setup.md)
- [All Markdown and JSON exports](https://elixir.menu/llms.txt)

## Maintain the source

Recommendation data and page content live in `content/`. The build generates the website and matching agent exports together.

Use Node 24 and Python 3, then run:

```sh
npm ci
npm run build
```

The static output is `dist/`. For a local preview, run `npm run dev`.

The guide is an editorial reference. It is not a framework or installer, and the complete set of optional libraries has not been tested as one integrated distribution.

## License

Original source and editorial content use [Apache 2.0](LICENSE). The bundled Rethink Sans font retains its SIL Open Font License; see [NOTICE](NOTICE). Linked projects keep their own licenses.
