const https = require('https');
const options = {
  hostname: 'www.loteriasyapuestas.es',
  port: 443,
  path: '/servicios/fechasv2?game_id=LAQU',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};
const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let data = '';
  res.on('data', d => { data += d; });
  res.on('end', () => console.log(data.substring(0, 300)));
});
req.on('error', error => console.error(error));
req.end();
