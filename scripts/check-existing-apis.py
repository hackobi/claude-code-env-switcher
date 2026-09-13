"""Read-only credential checks. Never print keys or provider response bodies."""
from pathlib import Path
import concurrent.futures, json, urllib.request, urllib.error, datetime

root = Path(__file__).resolve().parent.parent
env = {}
for line in (root / '.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        env[key.strip()] = value.strip().strip('\"\'')

checks = [
    ('anthropic', 'ANTHROPIC_API_KEY', 'https://api.anthropic.com/v1/models', 'x-api-key', None),
    ('openai', 'OPENAI_API_KEY', 'https://api.openai.com/v1/models', 'Authorization', None),
    ('typefully', 'TYPEFULLY_API_KEY', 'https://api.typefully.com/v2/social-sets', 'Authorization', None),
    ('rapidapi', 'RAPIDAPI_KEY', 'https://twitter-api45.p.rapidapi.com/screenname.php?screenname=demos_network', 'x-rapidapi-key', None),
    ('linear', 'LINEAR_API_KEY', 'https://api.linear.app/graphql', 'Authorization', {'query': '{ viewer { id } }'}),
    ('github', 'GITHUB_TOKEN', 'https://api.github.com/user', 'Authorization', None),
]

def check(spec):
    name, variable, url, header, body = spec
    value = env.get(variable, '')
    result = {'provider': name, 'variable': variable, 'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'scope': 'authentication/read only'}
    if not value or value.startswith('your_'):
        return dict(result, status='not_configured')
    auth = ('Bearer ' + value) if header == 'Authorization' and name != 'linear' else value
    headers = {header: auth, 'User-Agent': 'SocialEngine/1.0', 'Content-Type': 'application/json'}
    if name == 'anthropic': headers['anthropic-version'] = '2023-06-01'
    if name == 'rapidapi': headers['x-rapidapi-host'] = 'twitter-api45.p.rapidapi.com'
    try:
        req = urllib.request.Request(url, headers=headers, data=json.dumps(body).encode() if body else None)
        with urllib.request.urlopen(req, timeout=20) as response:
            data = json.load(response)
            result.update(status='passed', http_status=response.status)
            if isinstance(data, dict) and data.get('errors'): result['status'] = 'failed'
            if name in ['openai', 'anthropic']:
                ids = [m['id'] for m in data.get('data', [])]
                result['models'] = [m for m in ids if ('sonnet' in m or 'haiku' in m or m in ['gpt-5.5','gpt-4.1-mini'])]
            if name == 'typefully':
                sets = data.get('results', data.get('social_sets', [])) if isinstance(data,dict) else data
                result['social_set_count'] = len(sets)
    except urllib.error.HTTPError as error:
        result.update(status='failed', http_status=error.code)
    except Exception as error:
        result.update(status='unverified', error=type(error).__name__)
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, checks))
out = root / 'data' / 'api-validation.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'checks': results, 'generation_and_publishing_verified': False}, indent=2))
print(json.dumps(results, indent=2))
