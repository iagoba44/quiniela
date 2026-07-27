import axios from 'axios';
(async () => {
    try {
      const date = new Date().toISOString().split('T')[0];
      const targetUrl = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`;
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.sofascore.com/',
          'Origin': 'https://www.sofascore.com'
        }
      });
      console.log("Success", Object.keys(response.data));
    } catch (e) {
      console.error(e.message);
    }
})();
