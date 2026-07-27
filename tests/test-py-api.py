import urllib.request
import json

req = urllib.request.Request(
    'https://api.quinielista.es/jornadas/jornadasAbiertas', 
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8')[:300])
except Exception as e:
    print(e)
