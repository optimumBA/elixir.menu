"""Application-first specimen and matching agent guide; preserve the Phoenix specimen."""
import json
from html import escape as e
from pathlib import Path
from build_optional import render_optional

ROOT = Path(__file__).resolve().parents[1]

def render_shared_checks(data):
    checks = data['shared_checks']
    sources = ''.join(f'<a href="{e(url, quote=True)}">{e(label)}</a>' for label, url in checks['sources'])
    return f'<div class="shared-checks" id="quality"><h3>{e(checks["title"])}</h3><p>{e(checks["body"])}</p><div class="source-links">{sources}</div></div>'

def render_agent_guidance(data):
    item = data['agent_guidance']
    return f'<div class="shared-checks" id="agent-context"><h3>{e(item["title"])}</h3><p>{e(item["body"])}</p><a href="{e(item["url"], quote=True)}">{e(item["label"])}</a></div>'

def render_app_types(stack):
    data = json.loads((ROOT / 'content/app-types.json').read_text())
    optional_html, count = render_optional()
    picker = []; paths = []
    md = [f'# {data["title"]}', '', f'Reviewed: {data["reviewed"]}.', '', data['status'], '', 'Choose by application requirements. Phoenix and PostgreSQL are conditional choices, not prerequisites for Elixir. Read the project README and preserve existing decisions.', '']
    for item in data['types']:
        picker.append(f'<a href="#{e(item["id"])}"><strong>{e(item["name"])}</strong><span>{e(item["short"])}</span></a>')
        sources = ''.join(f'<a href="{e(url, quote=True)}">{e(label)}</a>' for label, url in item['sources'])
        start_note = f'<small>{e(item["start_note"])}</small>' if item.get('start_note') else ''
        command = f'<pre><code>{e(item["command"])}</code></pre>' if item['command'] else ''
        open_attr = ' open' if item['id'] == 'command-line' else ''
        paths.append(f'''<details class="application-path" id="{e(item['id'])}"{open_attr}><summary><span class="path-name"><strong>{e(item['name'])}</strong><small>{e(item['short'])}</small></span><span class="path-start">{e(item['start'])}{start_note}</span><span class="toggle" aria-hidden="true"></span></summary><div class="path-body"><h4>Starting point</h4><p>{e(item['explanation'])}</p>{command}<h4>Account for</h4><p>{e(item['boundary'])}</p><div class="source-links">{sources}</div></div></details>''')
        md.extend([f'## {item["name"]}', '', item['short'], '', f'Start with: {item["start"]}.', '', item['explanation'], ''])
        if item['command']: md.extend(['```sh', item['command'], '```', ''])
        md.extend([f'Account for: {item["boundary"]}', ''])
        md.extend(['Sources: ' + ' · '.join(f'[{label}]({url})' for label, url in item['sources']), ''])
    checks = data['shared_checks']
    md.extend([f'## {checks["title"]}', '', checks['body'], '', 'Sources: ' + ' · '.join(f'[{label}]({url})' for label, url in checks['sources']), ''])
    decisions = ''.join(f'<article><h3>{e(d["title"])}</h3><p>{e(d["body"])}</p></article>' for d in data['decisions'])
    md.extend(['## Decisions before dependencies', ''])
    for d in data['decisions']: md.extend([f'### {d["title"]}', '', d['body'], ''])
    steps=[]; md.extend(['## Instructions for agents', ''])
    guidance=data['agent_guidance']
    md.extend([f'### {guidance["title"]}', '', guidance['body'], '', f'[{guidance["label"]}]({guidance["url"]})', ''])
    for n, step in enumerate(data['agent_steps'], 1):
        steps.append(f'<article class="setup-step"><span class="step-number">{n:02}</span><div><h3>{e(step["title"])}</h3><p>{e(step["body"])}</p></div></article>')
        md.extend([f'### {n}. {step["title"]}', '', step['body'], ''])
    md.extend(['## Related references', '', '- [Optional libraries](optional.md)', '- [Phoenix-specific setup](setup.md)', '- [Phoenix application stack](stack.md)', ''])
    page = (ROOT / 'content/app-types.html').read_text()
    for token, value in {'PICKER': ''.join(picker), 'PATHS': ''.join(paths), 'SHARED_CHECKS': render_shared_checks(data), 'DECISIONS': decisions, 'OPTIONAL': optional_html, 'OPTIONAL_COUNT': str(count), 'AGENT_GUIDANCE': render_agent_guidance(data), 'AGENT_STEPS': ''.join(steps), 'STATUS': e(data['status'])}.items():
        page = page.replace('{{' + token + '}}', value)
    dist = ROOT / '.generated'
    (dist / 'variants/app-types.html').write_text(page)
    (dist / 'app-guide.md').write_text('\n'.join(md))
    (dist / 'app-guide.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print('Built application paths and synchronized agent exports.')
