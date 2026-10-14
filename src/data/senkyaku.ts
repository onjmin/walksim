// 夜の 寄り道の 先客（STORY.md §5.4「やられ役は 先客」。2026-10-14 作者の 決定）。
// キリコは 一度も つかまらない。ルールを 破ろうと すると、先に 迷いこんでいた 先客
// （レコードの 声の 主）が 身代わりに なる。その 瞬間は 見せず ハードカット。
// 身代わりが 出た 寄り道は その 夜 二度と 入れない：守りきって 帰った ときと 同じ「帰った」フラグ（KAERI）も
// 立てる（入口は KAERI だけで しまる。余波も 同じ ものを 出す）。窓の 場面は MIGAWARI で 見分ける。
// 誰も 死なない：窓の 場面で その 窓だけ 暗く、夜明けの さいごに 遅れて 灯る（street mado）。

import type { GameState, Story } from "../engine/defs";

/** 寄り道ごとの 身代わりの フラグ（レコードの id → フラグ）。人だけ いない 町は レコードが 無い。 */
export const MIGAWARI = {
	rec_e: "seen_ijou_migawari",
	rec_t: "seen_ura_migawari",
	rec_k: "seen_kawaku_migawari",
	rec_s: "seen_eki_migawari",
	jikuu: "seen_jikuu_migawari",
} as const;

export type MigawariKey = keyof typeof MIGAWARI;

/** 寄り道ごとの「帰った」フラグ（入口が しまる・余波が 出る）。 */
const KAERI: Record<MigawariKey, string> = {
	rec_e: "seen_ijou_kaeri",
	rec_t: "seen_ura_kaeri",
	rec_k: "seen_kawaku_kaeri",
	rec_s: "seen_eki_kaeri",
	jikuu: "seen_jikuu_kaeri",
};

/** その 寄り道で 身代わりが 出たか。 */
export const isMigawari = (s: Story, k: MigawariKey): boolean =>
	!!s.flag(MIGAWARI[k]);

/** GameState 版（when 用）。 */
export const isMigawariSt = (st: GameState, k: MigawariKey): boolean =>
	!!st.flags[MIGAWARI[k]];

/** 身代わりが 出た 数（窓の 場面の さいごに 遅れて 灯る 窓の 数）。 */
export const migawariCount = (s: Story): number =>
	(Object.keys(MIGAWARI) as MigawariKey[]).filter((k) => isMigawari(s, k))
		.length;

/**
 * 身代わり（ハードカット）。音も 絵も 一瞬で 切り、間を おく。
 * このあと 呼び手が 日常の 側へ warp して、のこった 持ち物を 見せる。
 */
export const migawari = async (s: Story, k: MigawariKey): Promise<void> => {
	s.set(MIGAWARI[k]);
	s.set(KAERI[k]);
	s.bgm(null);
	await s.fadeOut(0);
	await s.wait(2600);
};
