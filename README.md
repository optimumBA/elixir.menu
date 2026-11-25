# elixir.menu

Tools for your Elixir app. An independent guide by [Optimum Tech](https://optimum.ba/).

Start with one of seven application types, explore a preferred Phoenix + LiveView web stack, and choose optional libraries by feature. Each recommendation explains its reasons and limits.

## Read the guide

- [Website](https://elixir.menu/)
- [Start here for agents](https://elixir.menu/agents.md)
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

## Agent-readable pages

[Generation and verification](docs/agent-readability.md) owns the HTML/Markdown representations and information pages. The build also uses Python 3.

## Build lifecycle replay

After `npm ci`, use Node 24, Git, Python 3 and Quint 0.33.0 with `KOGEN_QUINT` pointing to its `cli.js`:

```sh
node scripts/replay.mjs /path/to/new-evidence-directory
```

Choose an unused directory under an existing parent, outside the checkout for qualification. See the [replay contract](.kogen/intents/quint-spec-replay-overhaul/intent.md). The bounded replay checks real full builds and retains source, tool, trace and snapshot evidence; it is not exhaustive verification. Dirty runs are diagnostic only. Recommendations, the setup recipe, information pages and the sponsor example are static; sponsor operations, agent actions, request negotiation, page interactions, deployment and external services are not replayed. Ordinary site, export and sponsor checks remain independent.

For `quint-mbt-cutover-20261125`, submit clean local revision, tool identities, evidence locations and digests, and ordinary check results to the Kogen change set. The coordinator must qualify exact enrolled revisions and the integrated assembly/Studio pair with their source dependencies before the single cutover. Local evidence is not integrated qualification and grants no approval, release or deployment.
