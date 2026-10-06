# Agent-readable public pages

The normal build creates page Markdown from final HTML through `scripts/build-agent-content.py`. `agent-site.json` owns the public site identity and agent use guidance; authored Astro pages own the visible content. Do not edit `dist/` by hand. Existing curated exports remain separate resources.

Cloudflare Pages Functions negotiate GET/HEAD HTML pages with `Accept: text/markdown`, preserve correct missing-page status, and set `Vary: Accept`. Ordinary HTML and static files retain their content; phx.tools retains its ordinary curl installer response. Information pages own About, Contact and the factual hosting/analytics disclosure. Update that notice when the collection configuration changes.

Build, inspect the generated Markdown against the HTML, then check both Accept variants and a nonexistent path through the existing Pages development route. After an approved production push, verify the exact deployment, headers, body, status and scanner timestamp. A cached CLI score does not verify a new deployment. Do not fabricate an address, availability or protocol to gain points.
