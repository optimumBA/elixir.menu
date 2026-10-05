"""Generate optional-tool reference and agent exports from content/optional.json."""
import json
from html import escape as e
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def render_optional():
    data = json.loads((ROOT / 'content/optional.json').read_text())
    md = ['# Optional tools for Elixir applications', '', f'Reviewed: {data["reviewed"]}.', '', data['status'], '', data['instruction'], '']
    groups = []
    for group in data['groups']:
        md.extend([f'## {group["title"]}', ''])
        rows = []
        for item in group['items']:
            sources = ''.join(f'<a href="{e(url, quote=True)}">{e(label)}</a>' for label, url in item['sources'])
            rows.append(f'''<details class="recommendation" id="{e(item['id'])}"><summary><span class="task">{e(item['job'])}</span><strong>{e(item['tool'])}</strong><span class="toggle" aria-hidden="true"></span></summary><div class="recommendation-body"><h4>Use it when</h4><p class="recommendation-summary">{e(item['when'])}</p><div class="explanation"><div><h4>How it fits</h4><p>{e(item['use'])}</p></div><div><h4>What else to account for</h4><p>{e(item['boundary'])}</p></div></div><div class="source-links">{sources}</div></div></details>''')
            md.extend([f'### {item["job"]}: {item["tool"]}', '', f'Use it when: {item["when"]}', '', f'How it fits: {item["use"]}', '', f'What else to account for: {item["boundary"]}', '', 'Sources: ' + ' · '.join(f'[{label}]({url})' for label, url in item['sources']), ''])
        groups.append(f'<section class="category" id="{e(group["id"])}"><h3>{e(group["title"])}</h3><div class="recommendations">{"".join(rows)}</div></section>')
    tracks = ''.join(f'<li><a href="{e(t["url"], quote=True)}">{e(t["tool"])}</a> — {e(t["job"])}.</li>' for t in data['specialist_tracks'])
    md.extend(['## Specialist projects', '', 'These need their own architecture and deployment plan:', ''] + [f'- [{t["tool"]}]({t["url"]}): {t["job"]}.' for t in data['specialist_tracks']] + [''])
    dist = ROOT / '.generated'
    (dist / 'optional.md').write_text('\n'.join(md))
    (dist / 'optional.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    count = sum(len(g['items']) for g in data['groups'])
    html = f'''<section class="optional-section" id="optional-tools" aria-labelledby="optional-title"><div class="section-title"><div><p class="small-label">OPTIONAL TOOLS / {count} USE CASES</p><h2 id="optional-title">What are you building?</h2></div></div><p class="section-intro">Choose these when the product needs them. Each entry explains the use case, how it fits, and the additional setup.</p><div class="agent-downloads"><a href="/optional.md">Read optional tools as Markdown</a><a href="/optional.json">JSON for agents</a></div>{''.join(groups)}<div class="evidence-note"><strong>Specialist projects</strong><p>These need their own architecture and deployment plan:</p><ul>{tracks}</ul></div></section>'''
    return html, count
