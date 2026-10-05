"""Render round 03 and export its agent procedure from one structured source."""
import json
from html import escape as e
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LABELS={'foundation':'Application','accounts':'Accounts & permissions','work':'Jobs & integrations','grow':'Queries & APIs','ship':'Testing & deployment','agents':'Agent context'}
def render_reference(data):
    from build_optional import render_optional
    optional_html, optional_count = render_optional()
    groups=[]; nav=[]
    for group in data['groups']:
        label=LABELS[group['id']]
        nav.append(f'<a href="#{group["id"]}">{e(label)}</a>')
        rows=[]
        for item in group['items']:
            sources=''.join(f'<a href="{e(url,quote=True)}">{e(title)}</a>' for title,url in item['sources'])
            opened=' open' if item['id']=='jobs' else ''
            rows.append(f'''<details class="recommendation" id="{item['id']}"{opened}><summary><span class="task">{e(item['job'])}</span><strong>{e(item['tool'])}</strong><span class="toggle" aria-hidden="true"></span></summary><div class="recommendation-body"><p class="recommendation-summary">{e(item['summary'])}</p><div class="explanation"><div><h4>Why we recommend it</h4><p>{e(item['why'])}</p></div><div><h4>Limitations</h4><p>{e(item['boundary'])}</p></div></div><div class="next"><h4>Next step</h4><p>{e(item['next'])}</p></div><div class="source-links">{sources}</div></div></details>''')
        groups.append(f'<section class="category" id="{group["id"]}" aria-labelledby="{group["id"]}-title"><h3 id="{group["id"]}-title">{e(label)}</h3><div class="recommendations">{"".join(rows)}</div></section>')
    setup=json.loads((ROOT/'content/setup.json').read_text())
    steps=[];md=[f'# {setup["title"]}','',f'Reviewed: {setup["reviewed"]}.','',setup['status'],'',setup['scope'],'','## Inputs','','Operating system, application name, destination, existing runtime/version constraints and local database access. Do not infer permission to overwrite existing work or make shared/external changes.','']
    for n,step in enumerate(setup['steps'],1):
        steps.append(f'<article class="setup-step"><span class="step-number">{n:02}</span><div><h3>{e(step["title"])}</h3><p>{e(step["body"])}</p><pre><code>{e(step["code"])}</code></pre><p class="step-check"><strong>Check:</strong> {e(step["check"])}</p></div></article>')
        md.extend([f'## {n}. {step["title"]}','',step['body'],'','```sh',step['code'],'```','',f'Check: {step["check"]}',''])
    md.extend(['## Sources','']+[f'- [{title}]({url})' for title,url in setup['sources']]+[''])
    page=(ROOT/'content/reference.html').read_text().replace('{{STACK_COUNT}}',str(sum(len(g['items']) for g in data['groups']))).replace('{{GROUP_NAV}}',''.join(nav)).replace('{{STACK}}',''.join(groups)).replace('{{OPTIONAL}}',optional_html).replace('{{OPTIONAL_COUNT}}',str(optional_count)).replace('{{SETUP_STATUS}}',e(setup['status'])).replace('{{SETUP}}',''.join(steps)).replace('{{SETUP_SOURCES}}',''.join(f'<a href="{e(url,quote=True)}">{e(title)}</a>' for title,url in setup['sources']))
    dist=ROOT/'.generated';(dist/'variants/reference.html').write_text(page);(dist/'setup.md').write_text('\n'.join(md))
    print('Built Reference variant and matching Phoenix setup instructions.')
