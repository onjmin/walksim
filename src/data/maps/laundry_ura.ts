// かわかない ままの コインランドリー（夜の 寄り道「終わらない 洗濯」。STORY.md §5.4）。
// 深夜、4ばんの『のこり　18分』を 見た あと、まわっている 店の 出口で「かわくまで　待つ」を
// えらぶと、ベンチで 待つ うちに ここに なる（laundry の deguchi）。入口に レコードは ない
// （ここの わすれものの 箱で、泣き声を 聞いた あとに 拾う。寄り道の 型を 一つ ずらす）。
// 地続き：同じ 店で、同じ 場所に いる。動くのは 時間だけ（ワープの 先は 同じ 店の 写し）。
//
// 店は 一つの まま。違和感は 一点に しぼる（作者 2026-10-14）：4ばんの『のこり　18分』が へらない。
// ほかは 日常の 店と 同じ 見た目で、曲が ない（乾燥機の 音だけ）。
//
// ルールは 1つ：乾燥機が とまるまで 店を 出ない（店の はり紙『乾燥中は、店を　はなれないで　ください』）。
// とまる 前に 出口を ふむと、えらばせて、出れば つかまる（tsukamaru）。
//
// 恐怖の 3要素（春日武彦『恐怖の正体』）:
//   危機感      乾燥機の 熱で 店が あつく なり、息が くるしく なる（出たいのに 出られない）
//   不条理感    『のこり　18分』が へらない（ほかは 日常の 店の まま。時計も ふつうに 読める）
//   視野狭窄    ガラスの むこうの 人影と、赤ちゃんの 泣き声。そのあと 箱で 拾う レコードの 声は「うちの　子の　声だ」で 切れる
//               （答えは ここでは 出さない。真の 筋の 窓の 場面で、その 人が 自分の 家で 子を あやしている）
//
// 段と回収（seen_kawaku_n＝ここで 何かを 調べた 数。調べる たびに 一段 すすむ。kawakuStep）:
//   1 乾燥機の 音だけ → 2 あつい → 3 ガラスの むこうに 人 → 4 ガラスを たたく → 5 泣き声
//   → 6 息が くるしい → 7 泣き声が やみ、4ばんが とまる（seen_kawaku_owari）
//   4ばんを あける  seen_kawaku_akete・ちいさな くつした（chiisai_kutsushita）→ 朝 店の おばちゃん「ぬくい」
//   出る            seen_kawaku_kaeri → すみれ町の 路地。laundry の 4ばんが とまって ドアが あいている
//   つかまった      seen_kawaku_mayotta（数）→ laundry の ベンチの まえで 目が さめる

import type { MapDef, Story } from "../../engine/defs";
import { numFlag, shinyaClock } from "../nostalgia";
import { kawakuReset, rows, tiles } from "./laundry";

/**
 * 出口を ふんだ（4ばんが とまる 前）。つかまる。暗転して、日常の 店の ベンチの まえで 目が さめる。
 * なにが あったかは 書かない。
 */
const tsukamaru = async (s: Story): Promise<void> => {
	kawakuReset(s);
	s.set("seen_kawaku_mayotta", numFlag(s, "seen_kawaku_mayotta") + 1);
	// 静寂（STORY.md §5.4）：その 瞬間は 見せず、音も なく 切って、あとの 場面へ とぶ
	s.bgm(null);
	await s.fadeOut(0);
	await s.wait(2600);
	await s.warp("laundry", 9, 7, "up", { fade: false });
	await s.fadeIn(0);
	await s.wait(1800);
	await s.narrate("……ベンチの　まえに、\nすわりこんでいた。");
	await s.wait(1200);
	await s.narrate("4ばんの　表示は、\n『のこり　18分』。");
};

/** 調べる たびに 一段 すすむ（調べた もの の あとに 一行）。7で 4ばんが とまる。 */
const kawakuStep = async (s: Story): Promise<void> => {
	if (s.flag("seen_kawaku_owari")) return;
	const n = numFlag(s, "seen_kawaku_n") + 1;
	s.set("seen_kawaku_n", n);
	if (n === 2) {
		await s.narrate("店の　中が、\nすこし　あつい。");
	} else if (n === 3) {
		await s.narrate("ガラスの　むこうに、\nだれかが　立っている。");
	} else if (n === 4) {
		s.se("tick", { volume: 0.5, pan: 0.3 });
		await s.wait(500);
		s.se("tick", { volume: 0.5, pan: 0.3 });
		await s.narrate("コン、コン。\nガラスを　たたく　音。");
	} else if (n === 5) {
		await s.wait(900);
		await s.narrate("ガラスの　むこうで、\n赤ちゃんの　泣き声。");
	} else if (n === 6) {
		await s.narrate("あつい。\n息が、くるしい。");
	} else if (n >= 7) {
		// 静寂：泣き声が やんで、音の ない 間の あとに とまる
		await s.wait(1600);
		await s.narrate("……泣き声が、やんだ。");
		await s.wait(2200);
		s.se("tick", { volume: 0.7 });
		await s.narrate("ピー。");
		await s.narrate("4ばんが、とまった。");
		s.set("seen_kawaku_owari");
	}
};

/** 調べる もの（中身の あとに 一段 すすむ）。 */
const shiraberu =
	(body: (s: Story) => Promise<void>) =>
	async (s: Story): Promise<void> => {
		await body(s);
		await kawakuStep(s);
	};

/** 4ばん（『のこり　18分』。とまったら あけられる）。 */
const yonban = async (s: Story): Promise<void> => {
	if (s.flag("seen_kawaku_owari")) {
		if (s.flag("seen_kawaku_akete")) {
			await s.narrate(
				"ちいさな　服は、もう　ない。\nドラムが、まだ　あたたかい。",
			);
			return;
		}
		s.set("seen_kawaku_akete");
		s.se("door", { volume: 0.4 });
		await s.narrate("ドアを　あけた。\nあたたかい　風。");
		await s.narrate("ちいさな　服が、\nたくさん。");
		await s.narrate("ドラムの　すみに、\nちいさな　くつした。");
		s.se("item");
		s.give("chiisai_kutsushita");
		return;
	}
	const n = numFlag(s, "seen_kawaku_n");
	if (n >= 5)
		await s.narrate("『のこり　18分』。\nドラムの　中に、ちいさな　服。");
	else await s.narrate("4ばんが　まわっている。\n『のこり　18分』");
	await kawakuStep(s);
};

/** 出口（とまる 前に 出ると つかまる。とまったら すみれ町の 路地へ）。 */
const deguchi = async (s: Story): Promise<void> => {
	if (s.flag("seen_kawaku_owari")) {
		kawakuReset(s);
		s.set("seen_kawaku_kaeri");
		await s.warp("sumire", 27, 3, "down", { se: "door" });
		// 一息：外の 音が 先に もどり、ことばは 遅れて ひとことだけ
		s.se("hum", { volume: 0.3 });
		await s.wait(1600);
		await s.narrate("路地の　街灯が、\nついている。");
		await s.wait(1200);
		await s.say("kiriko", "……さむいンゴ");
		return;
	}
	await s.narrate("4ばんは、まだ\nまわっている。");
	const i = await s.choose(["＞＞1 出る", "＞＞2 やめておく"], { cancel: 1 });
	if (i === 0) {
		await tsukamaru(s);
		return;
	}
	await s.move("player", "u");
};

export const laundryUra: MapDef = {
	id: "laundry_ura",
	name: "コインランドリー　しゃぼん",
	bgm: null,
	outside: "#14120e",
	tiles,
	rows,
	lights: [
		{ x: 3, y: 5, r: 3, color: "#e8f0ff" },
		{ x: 8, y: 5, r: 3, color: "#e8f0ff" },
		{ x: 10, y: 3, r: 1.5, color: "#eef4ff" },
	],
	events: [
		{
			id: "deguchi",
			x: 5,
			y: 9,
			trigger: "touch",
			exit: "down",
			through: true,
			run: deguchi,
		},
		{ id: "kansouki_4", x: 4, y: 3, trigger: "talk", run: yonban },
		...[1, 2, 3].map((x) => ({
			id: `kansouki_${x}`,
			x,
			y: 3,
			trigger: "talk" as const,
			run: shiraberu(async (s) => {
				await s.narrate(`${x}ばん。とまっている。`);
			}),
		})),
		{
			id: "sentakuki",
			x: 1,
			y: 6,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("せんたくきは、\nぜんぶ　とまっている。");
			}),
		},
		...[9, 10].map((x) => ({
			id: `bench_${x}`,
			x,
			y: 6,
			trigger: "talk" as const,
			run: shiraberu(async (s) => {
				await s.narrate("ベンチ。\nすわった　あとが　あたたかい。");
			}),
		})),
		{
			id: "jihanki",
			x: 10,
			y: 3,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("自販機。『あったか～い』が\n一列だけ。");
			}),
		},
		{
			id: "ryougae",
			x: 9,
			y: 3,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("両替機。\nみどりの　ランプ。");
			}),
		},
		{
			id: "keiji",
			x: 6,
			y: 2,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("『乾燥中は、店を\nはなれないで　ください』");
			}),
		},
		{
			id: "tokei",
			x: 8,
			y: 2,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate(`かべの時計。――${shinyaClock(s)}。`);
			}),
		},
		{
			id: "wasuremono",
			x: 9,
			y: 8,
			trigger: "talk",
			// 泣き声を 聞いた あと（5段め から）だけ、ハンカチの となりに レコード「夜泣き」。
			// ほかの 寄り道と ちがい、体験の あとに 声を 聞く（声の 主の 子か、と 遊ぶ 人が 結びつける）
			run: shiraberu(async (s) => {
				if (numFlag(s, "seen_kawaku_n") >= 5 && !s.has("rec_k")) {
					await s.narrate(
						"『わすれもの』の　箱。\nハンカチの　となりに、黒い　レコード。",
					);
					s.se("item");
					s.give("rec_k");
					await s.record("rec_k");
					await s.wait(1200);
					return;
				}
				await s.narrate("『わすれもの』の　箱。\nハンカチが　一まい。");
			}),
		},
	],
};
