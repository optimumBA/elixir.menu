#!/usr/bin/env python3
"""Generate the local reading site and matching agent exports from one stack source."""
import json
import shutil
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'content/stack.json').read_text())
output = ROOT / '.generated'
output.mkdir(exist_ok=True)
(output/'variants').mkdir(exist_ok=True)
sections = []
nav = []
markdown = [f"# {data['name']}", "", f"Reviewed: {data['reviewed']}. Edition {data['edition']}.", "", f"Status: {data['status']}.", "", f"Scope: {data['scope']}.", "", data['principle'], "", "See [checks for every Mix project](app-guide.md#checks-for-every-mix-project) for formatting, tests and optional static analysis.", "", "## Working agreement", "", "Use this as a starting recommendation, not authority over an existing project's decisions. Read the project README, installed-version documentation and lockfile. Keep business logic in contexts, authorization at the data/operation boundary, and durable work in Oban. Do not assume a library choice proves performance or correctness. Measure and test the actual application. Add dependencies only when their jobs exist.", "", "This edition is a guide, not an installer or a compatibility-tested starter. Commercial providers, supported version combinations and deployment operations require project-specific decisions. Follow the project’s existing agent-guidance conventions. See the general application guide for dependency guidance with usage_rules.", ""]
count = 0
for index, group in enumerate(data['groups'], 1):
    nav.append(f'<a href="#{escape(group["id"])}"><span>{index:02}</span>{escape(group["title"])}</a>')
    cards = []
    markdown.extend([f'## {index:02}. {group["title"]}', '', group['description'], ''])
    for item in group['items']:
        count += 1
        links = ' '.join(f'<a href="{escape(url, quote=True)}">{escape(label)}</a>' for label, url in item['sources'])
        stage_class = 'stage start' if item['stage'] == 'Start here' else 'stage'
        cards.append(f'''<details class="tool" id="{escape(item['id'])}">
<summary><span class="job">{escape(item['job'])}</span><span><span class="tool-name">{escape(item['tool'])}</span><span class="{stage_class}">{escape(item['stage'])}</span></span><span class="plus" aria-hidden="true"></span></summary>
<div class="tool-body"><p class="tool-summary">{escape(item['summary'])}</p><div class="reason-grid"><div><h4>Why this choice</h4><p>{escape(item['why'])}</p></div><div><h4>Know the boundary</h4><p>{escape(item['boundary'])}</p></div></div><div class="next-step"><h4>Put it to work</h4><p>{escape(item['next'])}</p></div><p class="source-line">Sources: {links}</p></div></details>''')
        markdown.extend([f'### {item["job"]}: {item["tool"]}', '', f'Add: {item["stage"]}.', '', item['summary'], '', f'Why: {item["why"]}', '', f'Boundary: {item["boundary"]}', '', f'Next: {item["next"]}', '', 'Sources: ' + ' · '.join(f'[{label}]({url})' for label, url in item['sources']), ''])
    sections.append(f'<section class="tool-group" id="{group["id"]}" aria-labelledby="{group["id"]}-title"><div class="group-heading"><span class="group-number">{index:02}</span><h3 id="{group["id"]}-title">{escape(group["title"])}</h3></div><p class="group-description">{escape(group["description"])}</p>{"".join(cards)}</section>')
markdown.extend(['## Optional tools', '', 'Choose additional libraries by product requirement. Read [the optional menu](optional.md) for use cases, integration boundaries and sources; [optional.json](optional.json) carries the same data for agents. Do not install the entire menu.', '', '## Architectural alternative: Ash', '', 'The default here is Phoenix contexts and Ecto. Ash is worth choosing early when a declarative resource/action model, policies and derived APIs are central to the product. It works with the Phoenix ecosystem. It is a deliberate architectural choice, not an extra dependency to add speculatively.', '', 'Source: https://hexdocs.pm/ash/what-is-ash.html', '', '## Evidence and limits', '', 'The self-selected State of Elixir 2025 survey reported Phoenix 97.1%, LiveView 85.7% and Ash 24.3% among 961 respondents to its framework question. This is an adoption signal, not market share or a performance result. Other selections are editorial judgments based on documentation.', '', 'Survey: https://elixir-hub.com/surveys/2025', '', 'An Optimum Tech project: https://optimum.ba. Independent of the Elixir and Phoenix teams.', ''])
(output / 'stack.md').write_text('\n'.join(markdown))
(output / 'stack.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
from build_reference import render_reference
from build_app_types import render_app_types
from build_menu import render_menu
render_reference(data)
render_app_types(data)
render_menu(data)
public=ROOT/'public'
public.mkdir(exist_ok=True)
for filename in ['stack.md','stack.json','app-guide.md','app-guide.json','optional.md','optional.json','runtime.md','runtime.json','setup.md']:
    shutil.copy2(output/filename,public/filename)
for filename in ['menu.css','menu.js','reference.css','reference.js','app-types.css']:
    shutil.copy2(ROOT/'assets'/filename,public/filename)
shutil.copytree(ROOT/'assets/brand',public/'brand',dirs_exist_ok=True)
for filename in ['LICENSE','NOTICE']:
    shutil.copy2(ROOT/filename,public/filename)
site=json.loads((ROOT/'content/site.json').read_text())
import os
preview=os.environ.get('SITE_MODE') == 'preview'
(public/'robots.txt').write_text('User-agent: *\nDisallow: /\n' if preview else f"User-agent: *\nAllow: /\n\nSitemap: {site['origin']}/sitemap.xml\n")
sitemap=public/'sitemap.xml'
if preview:
    sitemap.unlink(missing_ok=True)
else:
    urls=''.join(f"<url><loc>{escape(site['origin']+path)}</loc></url>" for path in site['routes'])
    sitemap.write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
