# 1. 払戻金

## 1.1. URL
~~~
https://keirin.netkeiba.com/race/result/?race_id={raceId}&rf=racellist
~~~

{raceId} = {YYYYMMDD}{JYO_CD}{レース番号:2桁}

例: 202603034412
    - 2026年03月03日
    - 大垣競輪場（コード: 44）
    - 第12レース

## 1.2. HTMLソース（例）

~~~
<div class="Result_Pay_Back" id="result_payback_section">
<div class="Title_Sec">
<h2>払戻金</h2>
</div><!-- /.Title_Sec -->
<table summary="払戻し" class="Payout_Detail_Table">
<tbody>
<tr class="Wakuren">
<th rowspan="1">枠複</th>
<td class="Result">1-3</td>
<td class="Payout"><span>160円</span></td>
<td class="Ninki"><span>1人気</span></td>
</tr><tr class="Wakutan">
<th rowspan="1">枠単</th>
<td class="Result">3&gt;1</td>
<td class="Payout"><span>380円</span></td>
<td class="Ninki"><span>1人気</span></td>
</tr><tr class="Umaren">
<th rowspan="1">２車複</th>
<td class="Result">1-3</td>
<td class="Payout"><span>220円</span></td>
<td class="Ninki"><span>1人気</span></td>
</tr><tr class="Umatan">
<th rowspan="1">２車単</th>
<td class="Result">3&gt;1</td>
<td class="Payout"><span>440円</span></td>
<td class="Ninki"><span>2人気</span></td>
</tr><tr class="Wide">
<th rowspan="3">ワイド</th>
<td class="Result">1-3</td>
<td class="Payout"><span>160円</span></td>
<td class="Ninki"><span>2人気</span></td>
</tr><tr class="Wide">

<td class="Result">3-7</td>
<td class="Payout"><span>260円</span></td>
<td class="Ninki"><span>3人気</span></td>
</tr><tr class="Wide">

<td class="Result">1-7</td>
<td class="Payout"><span>410円</span></td>
<td class="Ninki"><span>6人気</span></td>
</tr><tr class="Fuku3">
<th rowspan="1">３連複</th>
<td class="Result">1-3-7</td>
<td class="Payout"><span>390円</span></td>
<td class="Ninki"><span>1人気</span></td>
</tr><tr class="Tan3">
<th rowspan="1">３連単</th>
<td class="Result">3&gt;1&gt;7</td>
<td class="Payout"><span>1,050円</span></td>
<td class="Ninki"><span>2人気</span></td>
</tr>
</tbody>
</table>
</div><!-- /.Result_Pay_Back -->
~~~

## 1.3. データ
**払戻金の要素**

| 項目名        | データ設定例        |
| ------------- |---------------------|
| レースID      | RRRRRRRR            |
|   枠複        | 1=3                 |
|   枠単        | 3-1                 |
|   2車複       | 1=3                 |
|   2車単       | 3-1                 |
|   ワイド      | 1-3, 3-7, 1-7       |
|   3連複       | 1=3=7               |
|   3連単       | 3-1-7               |
| 登録日時      | yyyy-mm-dd hh:mm:ss |

1.4. 特記事項
- 枠複・2車複・3連複の場合、サイトには「〇-△」で記入されているが、「〇=△」でDBに登録する
- 枠単・2車単・3連単の場合、サイトには「〇>△」で記入されているが、「〇-△」でDBに登録する
- ワイドの場合、サイトには「〇-△」で記入されているが、「〇-△」でDBに登録する
- レースによっては、賭式に対する払戻金が記入されていない場合がある
