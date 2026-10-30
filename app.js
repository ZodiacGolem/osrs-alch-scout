/* Alch Scout — GitHub Pages compatible; no API key or backend required. */
'use strict';
const API = 'https://prices.runescape.wiki/api/v2/osrs';
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('en-US');
const fields = ['budget','sort','cushion','minVolume','maxAge','fireStaff','f2p'];
let market = null, inProgress = false, marketFetchedAt = null;
function showFreshness() {
  const target = $('marketFreshness');
  if (!marketFetchedAt) {target.textContent = 'Last market update: unavailable'; return;}
  const minutes = Math.max(0, Math.floor((Date.now() - marketFetchedAt.getTime()) / 60000));
  const age = minutes < 1 ? 'less than a minute ago' : minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  const level = minutes >= 30 ? 'STALE' : minutes >= 15 ? 'DELAYED' : 'FRESH';
  target.textContent = `Last market update: ${marketFetchedAt.toLocaleString()} (${age}) · ${level}${minutes >= 30 ? ' — check prices before buying' : ''}`;
  target.style.color = minutes >= 30 ? '#f87171' : minutes >= 15 ? '#fbbf24' : '#86efac';
}

async function getJson(path) {
  const response = await fetch(`${API}/${path}`, {headers: {'Accept':'application/json'}});
  if (!response.ok) throw new Error(`Market API returned ${response.status} (${path})`);
  return response.json();
}
function settings() {
  return {
    budget: Math.max(1, Number($('budget').value) || 1),
    cushion: Math.max(0, Number($('cushion').value) || 0),
    minVolume: Math.max(0, Number($('minVolume').value) || 0),
    maxAge: Math.max(5, Number($('maxAge').value) || 120) * 60,
    f2pOnly: $('f2p').checked,
    staff: $('fireStaff').value === 'staff',
    sort: $('sort').value
  };
}
function compute(mapping, latest, hourly, cfg, nowSeconds = Date.now() / 1000) {
  const latestData = latest.data || {};
  const hourlyData = hourly.data || {};
  const nature = latestData[561]; // Nature rune, OSRS item id 561
  const fire = latestData[554]; // Fire rune, OSRS item id 554
  if (!nature || !Number.isFinite(nature.high) || nature.high <= 0 || (!cfg.staff && (!fire || !Number.isFinite(fire.high) || fire.high <= 0))) {
    throw new Error('Current nature/fire rune buy prices are unavailable. Try refreshing.');
  }
  const runeCost = nature.high + (cfg.staff ? 0 : 5 * fire.high);
  const results = [];
  for (const item of mapping) {
    if (cfg.f2pOnly && item.members !== false) continue;
    if (!(item.highalch > 0) || !(item.limit > 0)) continue;
    const tick = latestData[item.id];
    const hour = hourlyData[item.id];
    if (!tick || !Number.isFinite(tick.high) || tick.high <= 0 || !tick.highTime) continue;
    const age = nowSeconds - tick.highTime;
    if (age < -300 || age > cfg.maxAge) continue;
    if (!hour || !Number.isFinite(hour.avgHighPrice) || hour.avgHighPrice <= 0 || (hour.highPriceVolume || 0) < cfg.minVolume) continue;
    const buyPrice = Math.ceil(Math.max(tick.high, hour.avgHighPrice) + cfg.cushion);
    const profit = item.highalch - buyPrice - runeCost;
    const upfront = buyPrice + runeCost;
    if (profit <= 0 || upfront > cfg.budget) continue;
    // High-alch cash is recovered per cast, but this deliberately uses upfront funds for conservative batch sizing.
    const quantity = Math.min(item.limit, Math.floor(cfg.budget / upfront));
    if (!quantity) continue;
    results.push({id:item.id, name:item.name, highalch:item.highalch, limit:item.limit,
      buyPrice, profit, runeCost, quantity, batchProfit:quantity * profit,
      roi:profit / upfront * 100, volume:hour.highPriceVolume || 0, ageMinutes:Math.max(0,Math.floor(age/60))});
  }
  const metric = cfg.sort === 'each' ? 'profit' : cfg.sort === 'roi' ? 'roi' : 'batchProfit';
  results.sort((a,b) => b[metric]-a[metric] || b.batchProfit-a.batchProfit || b.volume-a.volume);
  return {results:results.slice(0,5), count:results.length, runeCost, naturePrice:nature.high};
}
function el(tag, className, text) {const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function metric(parent,label,value){const d=el('div','metric');d.append(el('span','',label),el('strong','',value));parent.append(d);}
function render() {
  if(!market)return;
  try {
    const cfg=settings();
    const {results,count,runeCost,naturePrice}=compute(market.mapping,market.latest,market.hourly,cfg);
    $('natureCost').textContent=`${fmt(naturePrice)} GP`;
    $('castCost').textContent=`${fmt(runeCost)} GP`;
    $('matches').textContent=fmt(count);
    $('bestBatch').textContent=results.length?`${fmt(results[0].batchProfit)} GP`:'—';
    const root=$('cards');root.replaceChildren();
    if(!results.length){root.append(el('p','empty','No profitable F2P items passed your current filters. Try a lower minimum volume, larger budget, or a smaller price cushion.'));return;}
    results.forEach((item,i)=>{
      const card=el('article','item');
      const top=el('div','itemtop');top.append(el('span','rank',`#${i+1} OPPORTUNITY`),el('span','rank',`${fmt(item.volume)} buys / hr`));card.append(top);
      card.append(el('h3','itemname',item.name));
      const p=el('div','profit',`+${fmt(item.profit)} GP `);p.append(el('small','', 'per alch'));card.append(p);
      const grid=el('div','itemgrid');
      metric(grid,'Estimated buy',`${fmt(item.buyPrice)} GP`);
      metric(grid,'High alch value',`${fmt(item.highalch)} GP`);
      metric(grid,'Batch profit',`+${fmt(item.batchProfit)} GP`);
      metric(grid,'Buyable with budget',`${fmt(item.quantity)} items`);
      metric(grid,'GE buy limit (4 hours)',fmt(item.limit));
      metric(grid,'ROI per cast',`${item.roi.toFixed(2)}%`);
      card.append(grid);
      const bottom=el('div','bottom');bottom.append(el('span','',`Last instant buy: ${item.ageMinutes} min ago`));
      const link=el('a','', 'View GE prices ↗');link.href=`https://prices.runescape.wiki/osrs/item/${item.id}`;link.target='_blank';link.rel='noopener noreferrer';bottom.append(link);card.append(bottom);root.append(card);
    });
    $('status').className='status';$('status').textContent='● Market data loaded';
  }catch(err){$('status').className='status error';$('status').textContent=err.message;$('cards').replaceChildren(el('p','empty',err.message));}
}
async function refresh() {
  if(inProgress)return;
  inProgress=true;$('refresh').disabled=true;$('status').className='status';$('status').textContent='● Loading market data…';
  try{
    let snapshot;
    try {
      const response = await fetch(`./data/market.json?t=${Date.now()}`, {cache:'no-store'});
      if (!response.ok) throw new Error(`Cached market data returned ${response.status}`);
      snapshot = await response.json();
      if (!Array.isArray(snapshot.mapping) || !snapshot.latest?.data || !snapshot.hourly?.data) throw new Error('Cached market data is malformed');
    } catch (cachedError) {
      try {
        const [mapping,latest,hourly] = await Promise.all([getJson('mapping'),getJson('latest'),getJson('1h')]);
        snapshot = {mapping,latest,hourly,fetchedAt:new Date().toISOString()};
      } catch (liveError) {
        throw new Error(`Cached feed: ${cachedError.message}; live feed: ${liveError.message}`);
      }
    }
    market={mapping:snapshot.mapping,latest:snapshot.latest,hourly:snapshot.hourly};
    marketFetchedAt = new Date(snapshot.fetchedAt);
    if (!Number.isFinite(marketFetchedAt.getTime())) marketFetchedAt = null;
    showFreshness();
    $('updated').textContent=`Price snapshot ${new Date(snapshot.fetchedAt || Date.now()).toLocaleString()}`;
    render();
  }catch(err){$('status').className='status error';$('status').textContent='Market data unavailable';$('cards').replaceChildren(el('p','empty',`Could not load prices: ${err.message}. Check your internet connection and try again.`));}
  finally{inProgress=false;$('refresh').disabled=false;}
}
fields.forEach(id=>$(id).addEventListener(id==='f2p'||id==='sort'||id==='fireStaff'?'change':'input',render));
$('refresh').addEventListener('click',refresh);
refresh();
// Refresh at a responsible interval while visible (not every second).
setInterval(()=>{showFreshness();if(!document.hidden)refresh();},60000);
