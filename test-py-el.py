import urllib.request
import re

req = urllib.request.Request(
    'https://www.eduardolosilla.es/quiniela/ayudas/proximas', 
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print("HTML SIZE:", len(html))
        # Find JSON or data inside HTML
        match = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});', html)
        if match:
            print("FOUND INITIAL STATE")
except Exception as e:
    print(e)
