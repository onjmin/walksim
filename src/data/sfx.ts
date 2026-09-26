// 効果音。RPGEN の mp3（rpgen-search の CDN を id で直リンク）。
// 多くは unj-reze の DQ プリセット（components/game-presets/dq.ts）と同じ素材。
// 括弧内は RPGEN 上の素材名。
// 区分ごとに大きさの目標がある（data/loudness.ts）。足したり替えたりしたら pnpm loudness で測り直す
// （測るまでは、既定の音量で 0.3 倍のまま鳴る）。

import type { SeKind } from "./loudness";

const byKind: Record<SeKind, Record<string, string>> = {
	/** メニューの操作音。何度も鳴るので控えめ。 */
	ui: {
		cursor: "rpgen:GklUsK", // ﾄﾞﾗｸｴｶｰｿﾙ
		decide: "rpgen:GklUsK", // ﾄﾞﾗｸｴｶｰｿﾙ
		cancel: "rpgen:uZc2MS", // キャンセル
	},
	/** 移動・宝箱・回復。 */
	field: {
		door: "rpgen:8gPREU", // ﾄﾞﾗｸｴ扉
		warp: "rpgen:vfCmoe",
		stairs: "rpgen:gO9HUJ", // 階段
		item: "rpgen:gbcHf7", // ﾄﾞﾗｸｴ宝箱
		heal: "rpgen:n0UqyV", // ﾄﾞﾗｸｴ5回復
	},
	/** 場面の効果音（イベントの炎・電撃）。 */
	battle: {
		fire: "rpgen:HyTVhK",
		shock: "rpgen:usF2l8",
	},
	/** いちばん目立たせる音。 */
	impact: {
		explosion: "rpgen:HydVaH",
	},
	/** 短い曲（ファンファーレ）。 */
	jingle: {
		inn: "rpgen:L5Npni", // ﾄﾞﾗｸｴ宿屋（安全地帯で目が覚める場面に）
		save: "rpgen:jVOw87", // [自然癒]セーブ
		/** 章の切り替わり（システム音らしいチャイム。前の素材は「エンディング」と喋る声だった）。 */
		chapter: "rpgen:thHyyN", // [ツクール]チャイム2
	},
};
// ── MML の効果音（DESIGN §9・content-briefs「SE名簿」） ──
// RPGEN に無い音は MML で手打ちする。値は必ず `#volume=` から始める（engine/audio.ts が
// これで rpgen:/URL と見分け、dtm の内蔵シンセ＝矩形波で鳴らす）。
// 大きさは #volume で1音ずつ直に決める（SE_LOUDNESS の補正は掛からない・pnpm loudness は
// 測らず飛ばす）。雰囲気のゲームなので どれも小さく：BGM（#volume 15〜53）よりだいぶ低い
// 4〜9 に抑えてある。鳴らして大きすぎたら #volume を下げる。
const mmlSfx: Record<string, string> = {
	/** レコードの回転ノイズ（プチ、パチ。Story.record が seLoop でループさせる）。 */
	record: "#volume=4;@0t120v16o7c64r8c64r4c64r8c64r16c64r2c64r8c64r4;#end;",
	/** 針の上がる音（短くこすれて上がる。レコード再生の終わり）。 */
	needle: "#volume=5;@0t160v22o5c64d64f64g64a64>c64d32;#end;",
	/** 時計の秒針一打（room。止まった時計が動き出す演出にも）。 */
	tick: "#volume=5;@0t120v20o6b64;#end;",
	/** 蛍光灯のうなり（yellow の自販機など。半音でにごらせた約1秒のワンショット）。 */
	hum: "#volume=4;@0t120v14o2a2;@1t120v10o2a+2;#end;",
	/** 「ぽ」一打（八尺様。低くこもった一音。pan で方向、volume で距離を出す）。 */
	popo: "#volume=6;@0t100v22o2g32r64g64;#end;",
	/** 神社の鈴・鐘（village。高い二音が離れて響く）。 */
	kane: "#volume=5;@0t90v24o6e16r8v14e16r8v8e2;@1t90v16o7c+16r8v10c+16r8v6c+2;#end;",
	/** 鈴の音（シャン、と一振り。お守りの鈴）。 */
	suzu: "#volume=5;@0t150v20o7a32b32a32r32b32a32r16a16;#end;",
	/** 遠くの和太鼓一打（kisaragi。低く・小さく）。 */
	taiko: "#volume=7;@0t100v26o1g16r32v12g32;#end;",
	/** 電車の走行音ワンショット（約1.5秒。低いうねりを半音ずらしで重ねる）。 */
	train: "#volume=5;@0t120v14o1c8d8e8e8d8c8;@1t120v9o1c+8d+8f8f8d+8c+8;#end;",
	/** 小さくかわいい鳴き声（ミニワイ。もきゅ）。 */
	mokyu: "#volume=6;@0t160v22o6g32>c32;#end;",
};

export const sfx: Record<string, string> = {
	...Object.fromEntries(
		Object.values(byKind).flatMap((g) => Object.entries(g)),
	),
	...mmlSfx,
};

/** 効果音の区分（pnpm loudness が目標を引くのに使う）。 */
export const sfxKind: Record<string, SeKind> = Object.fromEntries(
	Object.entries(byKind).flatMap(([kind, g]) =>
		Object.keys(g).map((name) => [name, kind as SeKind]),
	),
);
