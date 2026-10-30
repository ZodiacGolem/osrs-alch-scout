// Fetch OSRS Wiki market data in GitHub Actions, where a descriptive User-Agent is supported.
import fs from 'node:fs/promises';
const base = 'https://prices.runescape.wiki/api/v2/osrs';
async function load(path) {
  const url = `${base}/${path}`;
  for (let i=0;i<3;i++) {
    try {
      const r = await fetch(url, {headers:{'User-Agent':'AlchScout/1.0 (github.com/ZodiacGolem/osrs-alch-scout)','Accept':'application/json'}});
      if (!r.ok) throw Error(`${path}: HTTP ${r.status}`);
      return await r.json();
    } catch(e) {
      if(i===2)throw e;
      await new Promise(resolve=>setTimeout(resolve,1500*(i+1)));
    }
  }
}
const [mapping,latest,hourly]=await Promise.all([load('mapping'),load('latest'),load('1h')]);
if(!Array.isArray(mapping)||!latest?.data||!hourly?.data||!latest.data['561'])throw Error('Invalid OSRS Wiki price payload');
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/market.json',JSON.stringify({mapping,latest,hourly,fetchedAt:new Date().toISOString()}));
console.log('Market snapshot updated', new Date().toISOString(), mapping.length, 'mapped items');
