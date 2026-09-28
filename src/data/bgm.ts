// BGM（MML）。rpg（蓄音キリコ 〜1000レス目のうた〜）と roguelike（蓄音キリコの大冒険）の曲を流用。
// 前奏（@0 が r1r1r1r1 で始まる4小節）のある曲は、2周目から前奏を飛ばしてループする（engine/audio.ts の hasIntro）。
// 歌入りの曲も playMML / studio.play では歌詞行（@@n）が除かれ、インストとして鳴る。
//
// ■ 大きさ（ラウドネス。data/loudness.ts）
// 曲ごとの大きさは MML の #volume=（曲全体の音量。dtm では振幅に比例）でそろえてある。
// 目標は、既定の BGM 音量（40）で I = -23 LUFS（sad・ending は静かな曲なので -24）。
// 測り方: 高音質（studio.play）で1ループを最終出力から録って I（ゲート付きの平均）を測る
// （BS.1770。既定の 40 では setVolume = #volume × 0.2）。
// 直し方: 新しい #volume = 今の #volume × 10^((目標 − 測った I) / 20) を整数に丸める。
// 曲を足したり書き換えたりしたら、測って同じ式で直す。#volume= 以外は変えない。
//
// rpg での実測（2026-09。secret は rpg で -24 にそろえた寄り道の曲）:
// | 曲       | 測った I | #volume | 直した後 |
// |----------|----------|---------|----------|
// | title    | -21.8    | 17 → 15 | -22.9    |
// | tense    | -30.1    | 15 → 34 | -23.0    |
// | sad      | -24.9    | 26 → 29 | -24.0    |
// | ending   | -23.6    | 18 → 17 | -24.1    |
// | secret   | -17.0    | 50 → 22 | -24.1    |
// roguelike での実測（2026-09。dev/bgm-measure.ts で1周鳴らして測ったもの。
// 大きい #volume では dtm のリミッタで つぶれて比例しない。測り直して決めること）:
// | 曲       | 測った I               | #volume | 直した後 |
// |----------|------------------------|---------|----------|
// | retro    | -14.0（50）/-27.9（16）| 50 → 26 | -23.6    |
// | deep1    | -25.4（20）            | 20 → 24 | （比例） |
// | deep2    | -32.1（20）            | 20 → 53 | -23.7    |
// | deep4    | -29.0（20）            | 20 → 37 | -23.7    |
// walksim での実測（2026-09-27。dev/bgm.html＝roguelike から移植。新作曲は make-bgm.mjs の head.volume）。
// 目標は -23（日常の時間帯の曲 amb_* と kowareta は生活音の下に薄く流すので -30）。
// 1回目の値から式で直し、2回目の測定で ±0.5 dB 以内（大きな #volume でもリミッタで潰れず比例した）:
// | 曲         | 1回目 I（#volume） | 直した #volume | 2回目 I |
// |------------|--------------------|----------------|---------|
// | title      | -31.3（22）        | 57             | -23.0   |
// | hub        | -37.7（18）        | 98 → 96        | -22.8   |
// | yellow     | -43.6（16）        | 172 → 176      | -23.2   |
// | kakolog    | -44.3（16）        | 185            | -23.0   |
// | village    | -44.3（16）        | 187 → 188      | -23.1   |
// | amb_yu     | -47.9（12）        | 95 → 90        | -29.5   |
// | amb_yoru   | -45.1（12）        | 69 → 68        | -29.8   |
// | amb_shinya | -48.7（11）        | 95 → 93        | -29.8   |
// | amb_asa    | -46.8（12）        | 83 → 84        | -30.1   |
// | kowareta   | -32.8（8）         | 11             | -30.1   |
// （→ の右は2回目の結果から式で詰めた最終値。差は 0.5 dB 未満）
// Dequivsia 系の試作 v2（2026-09-28。dtm 2.1.27。原曲は #volume=80。目標 -30）:
// | 曲           | 1回目 I（#volume） | 直した #volume | 2回目 I |
// |--------------|--------------------|----------------|---------|
// | amb_minasoko | -21.9（80）        | 32             | -29.9   |
// | amb_kazan    | -21.2（80）        | 29             | -30.0   |
// | amb_zure     | -20.3（80）        | 26             | -30.0   |
// | amb_kansouki | -20.1（80）        | 25 → 26        | -30.3   |
// | amb_hakuhyo  | -22.9（80）        | 35             | -30.0   |
// 軽量モード（内蔵シンセ）は音色が違うので少しずれる。ending の歌入り（singBgm）は インストより 15.6 dB
// 小さく鳴るので、engine/audio.ts の SING_GAIN で上げて インストと そろえてある。

// 2026-09-27 作者判断で新しく作曲（scripts/make-bgm.mjs の生成品。参考作品の静かな夜のローファイ／
// 柔らかいチップチューンの空気）。title は旧 6c5cd6e3edc4433b「ゲーム音楽っぽい何か」を差し替え
// （kowareta はその旧 title の変奏なので、そのまま残る）。#volume= は測ってそろえた値（冒頭の表）
import amb_asa from "./bgm/amb_asa.mml?raw"; // 日常・朝（カリンバ）
// 2026-09-28 作者提供「Dequivsia 系の試作 v2」（dtm の ambient_cloud・4トラック。作者が dtm で作った曲）。
// 日常の地区の差しかえ（MapDef.todBgm）として、町はずれと自室の夜にだけ流す。原曲の #loop=on は外した
// （ループはゲームが決める）。v3（高域の足りない音色を入れ替えた版）が来たら差し替えて測り直す。
import amb_hakuhyo from "./bgm/amb_hakuhyo.mml?raw"; // 「薄氷の回廊」→ せんろぞいのみち（宵・深夜）
import amb_kansouki from "./bgm/amb_kansouki.mml?raw"; // 「乾燥機がまわるあいだ」→ 自室・アパート（深夜）
import amb_kazan from "./bgm/amb_kazan.mml?raw"; // 「活火山の底」→ やまみち（深夜）
import amb_minasoko from "./bgm/amb_minasoko.mml?raw"; // 「水底にさす光」→ うみべ（宵・深夜）
import amb_shinya from "./bgm/amb_shinya.mml?raw"; // 日常・深夜（パッドと こだまする矩形波）
import amb_yoru from "./bgm/amb_yoru.mml?raw"; // 日常・宵（チェレスタ）
import amb_yu from "./bgm/amb_yu.mml?raw"; // 日常・夕方（ビブラフォン）
import amb_zure from "./bgm/amb_zure.mml?raw"; // 「ずれる地層」→ こくどう（深夜）
// 層ごとの曲（roguelike。作曲エージェントが dtm の手書き譜面 docs/handscore.md で書いたもの）
import deep1 from "./bgm/deep1.mml?raw"; // ハ短調 128・retro_game・8beat（掘る動機の行進）→ 回線の間
import deep2 from "./bgm/deep2.mml?raw"; // ト短調 90・orchestra（ライン・クリシェ、打楽器なし）→ 黄色い部屋
import deep4 from "./bgm/deep4.mml?raw"; // ニ短調 150・cyber_punk・16beat → 過去ログの地層
import ending from "./bgm/ending.mml?raw"; // b312cbafed564277「変ト長調 (G♭) デュエット」
import hub from "./bgm/hub.mml?raw"; // 回線の間（待合室のラウンジ・遠いチャイム）
import kakolog from "./bgm/kakolog.mml?raw"; // 過去ログの地層（オルゴールと合唱）
// 新規手打ち（音響担当。DESIGN §9「品質担保の原則」＝既存MMLの編集的変換）
// title の「壊れた再演」（#edo=31・t72・2トラック・長い休符・2音だけ約39セントずれ）
// → クリア後の 無題のレコード『　』（docs/style-kaiwai.md §3-1）。朗読なしで、これを流すだけ。
// #volume=11 で -30 LUFS（2026-09-27 測定。冒頭の表）。
// ※ zerouta.mml（ゼロの代読歌）は BGM ではないのでここに登録しない。
//   terminus のスクリプトが ?raw で import して engine/audio.ts の singOnce(mml) に渡す。
import kowareta from "./bgm/kowareta.mml?raw";
// うんｊレゼ の 名無し155 の曲（使ってよい曲として もらったもの）
import retro from "./bgm/retro.mml?raw"; // post/1316 の >>9 30b7932c9e1a4102「今回はメロディ手で書いたわ。正直こっちのが好き」
import sad from "./bgm/sad.mml?raw"; // 155deb066bc94429「イ短調（Aマイナー）」→ 夕暮れの村
import secret from "./bgm/secret.mml?raw"; // a91d232600e24c6a「修正版。オクターブ計算ミスってメロディがガタガタやったの直した」→ 供養スレ駅
import tense from "./bgm/tense.mml?raw"; // 1d9e7eed2db44ce7「荒ぶるメロディライン」→ きさらぎ駅
import title from "./bgm/title.mml?raw"; // タイトル（夕方の日常・変ニ長調のローファイ）
import village from "./bgm/village.mml?raw"; // 夕暮れの村（都節の箏と尺八）
import yellow from "./bgm/yellow.mml?raw"; // 黄色い部屋（蛍光灯のうなり）

export const bgm: Record<string, string> = {
	title,
	ending,
	sad,
	secret,
	tense,
	deep1,
	deep2,
	deep4,
	retro,
	kowareta,
	amb_yu,
	amb_yoru,
	amb_shinya,
	amb_asa,
	amb_minasoko,
	amb_kazan,
	amb_zure,
	amb_kansouki,
	amb_hakuhyo,
	hub,
	yellow,
	kakolog,
	village,
};
