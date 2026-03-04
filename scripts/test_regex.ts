import * as cheerio from 'cheerio';

const html = `
<div class="RaceList_Main_Box">
<a href="https://keirin.netkeiba.com/db/result/?race_id=202603034412" class="">
<div class="RaceList_Item01">
<div class="Race_Num" id="racing_num_202603034412" data-race_state="2">
<span>12R</span>
</div>
</div>
<div class="RaceList_Item02">
<dl>
<dt class="Race_Name">Ｓ級 決勝</dt>
<dd class="Race_Data"><span>発走 16:20</span> <span>締切 16:15</span> <span>9車</span></dd>
</dl>
</div>
</a>
</div>
`;

const $ = cheerio.load(html);
const box = $('.RaceList_Main_Box');
const raceDataText = $(box).find('.Race_Data').text().trim();
console.log('raceDataText:', JSON.stringify(raceDataText));

const dep_m = raceDataText.match(/発走\s*([\d０-９]{1,2}[:：][\d０-９]{2})/);
console.log('dep_m:', dep_m);

const timeStr = dep_m ? dep_m[1].replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)).replace('：', ':') : '';
console.log('timeStr:', timeStr);
