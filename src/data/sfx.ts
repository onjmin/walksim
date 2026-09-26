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
// TODO（次の段階）: レコードノイズ（ループ用 "record"）・針の音（"needle"）・太鼓・鈴・
// 時計の秒針・蛍光灯のうなり を RPGEN で探して足す（DESIGN §9。足したら pnpm loudness）。

export const sfx: Record<string, string> = Object.fromEntries(
	Object.values(byKind).flatMap((g) => Object.entries(g)),
);

/** 効果音の区分（pnpm loudness が目標を引くのに使う）。 */
export const sfxKind: Record<string, SeKind> = Object.fromEntries(
	Object.entries(byKind).flatMap(([kind, g]) =>
		Object.keys(g).map((name) => [name, kind as SeKind]),
	),
);
