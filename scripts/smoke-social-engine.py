"""Exercise tenant-scoped HTTP boundaries and a small live text request."""
import urllib.request, urllib.error, json, time
from pathlib import Path
BASE='http://127.0.0.1:5175'
def request(path,body=None):
    r=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','Origin':BASE})
    with urllib.request.urlopen(r,timeout=90) as res:return json.load(res)
common={'name':'Engine QA temporary','slug':'engine-qa-temporary','industry':'technology','description':'A temporary software test client, not a real business.','audience':'Software testers','facts':'This workspace validates tenant isolation. It has no offers or products.','voice':'Plain factual test copy. Label every caption TEST ONLY.','channels':['x'],'sources':['brief']}
existing=request('/api/clients')['clients']
if not any(c['slug']==common['slug'] for c in existing):request('/api/clients',common)
before=request('/api/c/engine-qa-temporary/overview')
demos=request('/api/c/demos/overview')
assert len(before['items'])==0, 'Test workspace must start empty'
try:
    request('/api/c/engine-qa-temporary/content/'+demos['items'][0]['id'],{'title':'Attempt','variants':[{'platform':'x','text':'Must fail'}]})
    raise AssertionError('Cross-client edit accepted')
except urllib.error.HTTPError as e:assert e.code==400
job=request('/api/c/engine-qa-temporary/generate',{'brief':'TEST ONLY: Draft three short ways to explain why client workspaces must keep content separate. State no product capabilities or offers.'})
print(json.dumps({'job':job['id'],'status':'queued','cross_client_edit':'rejected'}),flush=True)
for _ in range(80):
    data=request('/api/c/engine-qa-temporary/overview');current=next(j for j in data['jobs'] if j['id']==job['id'])
    if current['status'] in ['completed','failed']:break
    time.sleep(2)
assert current['status']=='completed',current.get('error') or 'Timed out'
assert len(data['items'])==3
assert all(not i['gate'] for i in data['items']), 'Generated drafts failed policy checks'
assert not any(x['id'] in {d['id'] for d in demos['items']} for x in data['items'])
report={'client_isolation_http':'passed','generation':'passed','draft_count':len(data['items']),'usage':data['usage'],'demos_drafts_unchanged':len(request('/api/c/demos/overview')['items'])==len(demos['items'])}
out=Path(__file__).resolve().parent.parent/'data'/'generation-smoke.json';out.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
