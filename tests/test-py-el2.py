import urllib.request
import re
import json

req = urllib.request.Request(
    'https://www.eduardolosilla.es/quiniela/ayudas/proximas', 
    headers={
        'User-Agent': 'Mozilla/5.0'
    }
)

with urllib.request.urlopen(req) as response:
    html = response.read().decode('utf-8')
    scripts = re.findall(r'<script.*?>(.*?)</script>', html, re.DOTALL)
    for i, s in enumerate(scripts):
        if 'partido' in s or 'jornada' in s:
            print("SCRIPT", i, len(s))
            print(s[:500])
