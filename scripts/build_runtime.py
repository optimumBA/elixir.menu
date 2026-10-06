"""Render runtime choices and matching exports from their maintained owners."""
import json
from html import escape as e
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def render_runtime():
    data = json.loads((ROOT / 'content/runtime.json').read_text())
    optional = json.loads((ROOT / 'content/optional.json').read_text())
    tools = {item['id']: item for group in optional['groups'] for item in group['items']}
    md = [f'# {data["title"]}', '', f'Reviewed: {data["reviewed"]}.', '', data['intro'], '', data['status'], '']
    groups = []
    for group in data['groups']:
        md.extend([f'## {group["title"]}', ''])
        rows = []
        for item in group['items']:
            sources = ''.join(f'<a href="{e(url, quote=True)}">{e(label)}</a>' for label, url in item['sources'])
            rows.append(f'<details class="recommendation" id="{e(item["id"])}"><summary><span class="task">{e(item["job"])}</span><strong>{e(item["tool"])}</strong><span class="toggle" aria-hidden="true"></span></summary><div class="recommendation-body"><h4>Reach for it when</h4><p>{e(item["when"])}</p><h4>Know the tradeoff</h4><p>{e(item["boundary"])}</p><div class="source-links">{sources}</div></div></details>')
            md.extend([f'### {item["job"]}: {item["tool"]}', '', f'Reach for it when: {item["when"]}', '', f'Tradeoff: {item["boundary"]}', '', 'Sources: ' + ' · '.join(f'[{label}]({url})' for label, url in item['sources']), ''])
        groups.append(f'<section class="category" id="{e(group["id"])}"><h3>{e(group["title"])}</h3><div class="recommendations">{"".join(rows)}</div></section>')
    # Pipeline descriptions remain owned by optional.json, not copied prose.
    pipelines = []
    md.extend(['## When a task is not enough', ''])
    for tool_id in data['pipeline_ids']:
        item = tools[tool_id]
        pipelines.append(f'<p><a href="#{e(tool_id)}"><strong>{e(item["tool"])}</strong></a> — {e(item["when"])}</p>')
        md.extend([f'- [{item["tool"]}](optional.md): {item["when"]}'])
    md.append('')
    notes = []
    for note in data['notes']:
        sources = ''.join(f'<a href="{e(url, quote=True)}">{e(label)}</a>' for label, url in note['sources'])
        notes.append(f'<div class="reason"><h3>{e(note["title"])}</h3><p>{e(note["body"])}</p><div class="source-links">{sources}</div></div>')
        md.extend([f'## {note["title"]}', '', note['body'], '', 'Sources: ' + ' · '.join(f'[{label}]({url})' for label, url in note['sources']), ''])
    export = dict(data)
    export['pipelines'] = [tools[tool_id] for tool_id in data['pipeline_ids']]
    dist = ROOT / '.generated'
    (dist / 'runtime.md').write_text('\n'.join(md))
    (dist / 'runtime.json').write_text(json.dumps(export, ensure_ascii=False, indent=2) + '\n')
    return f'<section id="runtime" class="menu-section" aria-labelledby="runtime-title"><div class="section-title"><div><p class="small-label">03 / OTP AND PERFORMANCE</p><h2 id="runtime-title">Choose the runtime tool.</h2></div></div><p class="section-intro">{e(data["intro"])}</p><div class="agent-downloads"><a href="/runtime.md">Read runtime choices as Markdown</a><a href="/runtime.json">JSON for agents</a></div><p class="section-intro">{e(data["status"])}</p>{"".join(groups)}<div class="reason"><h3>When a task is not enough</h3>{"".join(pipelines)}</div>{"".join(notes)}</section>'
