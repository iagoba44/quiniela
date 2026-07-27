import requests
from bs4 import BeautifulSoup
import json

try:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    }
    r = requests.get('https://www.loteriasyapuestas.es/es/la-quiniela', headers=headers, timeout=10)
    print("Status:", r.status_code)
    print("HTML snippet:", r.text[:300])
except Exception as e:
    print(e)
