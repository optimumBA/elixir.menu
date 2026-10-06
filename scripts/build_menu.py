"""Compose the current menu from the maintained recommendation and path owners."""
import json, re, shutil
from html import escape as e
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def render_menu(stack):
    from build_optional import render_optional
    from build_app_types import render_shared_checks, render_agent_guidance
    from build_reference import LABELS
    from build_runtime import render_runtime
    dist=ROOT/'.generated'
    reference=(dist/'variants/reference.html').read_text()
    app=(dist/'variants/app-types.html').read_text()
    # Generated component boundaries are owned by the existing renderers.
    start=reference.index('<section class="category"')
    end=reference.index('<section class="optional-section"')
    stack_html=reference[start:end].replace(' id="jobs" open',' id="jobs"')
    paths=app.split('<div class="application-paths">',1)[1].split('</div></section>',1)[0]
    # Present web first, with all paths available and none forced open.
    blocks=re.findall(r'<details class="application-path".*?</details>',paths,re.S)
    blocks.sort(key=lambda s: 0 if 'id="web-project"' in s else 1)
    paths=''.join(blocks).replace(' open>','>').replace('/variants/reference.html#','#').replace('href="/variants/reference.html"','href="#stack"')
    # The published menu nests paths directly beneath an h2 section.
    paths=paths.replace('<h4>', '<h3 class="path-detail-title">').replace('</h4>', '</h3>')
    data=json.loads((ROOT/'content/app-types.json').read_text())
    steps=''.join(f'<article class="setup-step"><span class="step-number">{n:02}</span><div><h3>{e(s["title"])}</h3><p>{e(s["body"])}</p></div></article>' for n,s in enumerate(data['agent_steps'],1))
    setup=reference.split('<article class="setup-step">',1)[1].split('<div class="setup-sources">',1)[0]
    setup='<article class="setup-step">'+setup
    optional,count=render_optional()
    optional=optional.replace('OPTIONAL TOOLS / '+str(count)+' USE CASES','04 / OPTIONAL TOOLS').replace('What are you building?','Libraries for the features you need.')
    nav=''.join(f'<a href="#{g["id"]}">{e(LABELS[g["id"]])}</a>' for g in stack['groups'])
    values={'PATHS':paths,'SHARED_CHECKS':render_shared_checks(data),'STACK':stack_html,'STACK_COUNT':str(sum(len(g['items']) for g in stack['groups'])),'GROUP_NAV':nav,'OPTIONAL':optional,'AGENT_GUIDANCE':render_agent_guidance(data),'SETUP_STATUS':e(json.loads((ROOT/'content/setup.json').read_text())['status']),'AGENT_STEPS':steps,'SETUP':setup}
    page=(ROOT/'content/menu.html').read_text()
    values['RUNTIME'] = render_runtime()
    for k,v in values.items():page=page.replace('{{'+k+'}}',v)
    (dist/'index.html').write_text(page)
    shutil.copytree(ROOT/'assets/brand',dist/'brand',dirs_exist_ok=True)
    print('Built branded elixir.menu homepage from the shared content owners.')
