import urllib.request
import re

req = urllib.request.Request('https://www.eduardolosilla.es/quiniela/ayudas/proximas', headers={'User-Agent': 'Mozilla'})
with urllib.request.urlopen(req) as response:
    html = response.read().decode('utf-8')
    scripts = re.findall(r'<script.*?>(.*?)</script>', html, re.DOTALL)
    with open('/tmp/script11.txt', 'w') as f:
        f.write(scripts[11])
