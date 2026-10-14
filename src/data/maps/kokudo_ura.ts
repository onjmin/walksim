// 人だけ いない こくどう（夜の 寄り道「人だけ いない 町」。STORY.md §5.4。2ch 洒落怖 104 の 時空のおっさん）。
// 深夜、歩道橋を わたって 北の 階段を おりると、ここに 出る（kokudo の hodo_dn_e。レコードは 無い）。
// 地続き：歩道橋を わたった 先の、ファミレスの 前。帰りも 北の 階段を のぼって 歩道橋へ もどる。
//
// 見た目は こくどうと 同じ。ちがうのは 灯りと 音：つぶれた ファミレスに 灯りが つき、店内放送が
// ながれ、テーブルの コーヒーに 湯気が たち、国道の 信号も スタンドも 動いている。人だけ いない。
//
// ルールは 1つ：作業着の 男に「帰れ」と 言われたら、すぐ 帰る（ほかの ものを 調べない）。
// 言われた あとに 何かを 調べると、つかまる（tsukamaru）。
//
// 恐怖の 3要素（春日武彦『恐怖の正体』）:
//   危機感      町の はしが くずれる 音が 近づき、街灯が はしから 消えていく
//   不条理感    いつもの 町に、電気も 店も 動いているのに 人だけ いない
//   視野狭窄    男は なぜ 怒っているのか。帰れなかったら どう なるのか（答えは 出さない。男の 姿は
//               スタンドの 店員と 同じ 作業着で、朝の 店員は ゆうべの スタンドの 灯りの 話だけ する）
//
// 段と回収（seen_jikuu_n＝ここで 何かを 調べた 数。調べる たびに 一段 すすむ。jikuuStep）:
//   1 着く → 2 信号が 青、車は 来ない → 3 くずれる 音 → 4 西の 街灯が 消える
//   → 5 作業着の 男「帰れ」（seen_jikuu_kaere）→ 6 それでも 調べたら つかまる
//   帰り     seen_jikuu_kaeri → kokudo の ファミレスの 戸の すきまに コーヒーの におい
//            → 朝 スタンドの 店員「ゆうべ、うちの　あかりが　ぜんぶ　ついてたって」
//   つかまった seen_jikuu_mayotta（数）→ kokudo の 歩道橋の 下で 目が さめる

import type { MapDef, Story } from "../../engine/defs";
import { npc } from "../helpers";
import { numFlag } from "../nostalgia";
import { JP } from "../tiles";
import { jikuuReset, rows, tiles } from "./kokudo";

const SAGYOUGI = "pub:sprites/mob_worker.png";
const OTOKO = "作業着の人";

/**
 * 「帰れ」の あとに 調べた。暗転して、日常の こくどうの 歩道橋の 下で 目が さめる。
 * なにが あったかは 書かない。
 */
const tsukamaru = async (s: Story): Promise<void> => {
	jikuuReset(s);
	s.set("seen_jikuu_mayotta", numFlag(s, "seen_jikuu_mayotta") + 1);
	await s.narrate("男が、こちらを\n見ていた。");
	// 静寂（STORY.md §5.4）：その 瞬間は 見せず、音も なく 切って、あとの 場面へ とぶ
	s.bgm(null);
	await s.fadeOut(0);
	await s.wait(2600);
	await s.warp("kokudo", 24, 10, "down", { fade: false });
	await s.fadeIn(0);
	await s.wait(1800);
	await s.narrate("……歩道橋の　下に、\nすわりこんでいた。");
	await s.wait(1200);
	await s.narrate("国道は、しんと　している。");
};

/** 調べる たびに 一段 すすむ（調べた もの の あとに 一行）。「帰れ」の あとは つかまる。 */
const jikuuStep = async (s: Story): Promise<void> => {
	if (s.flag("seen_jikuu_kaere")) {
		await tsukamaru(s);
		return;
	}
	const n = numFlag(s, "seen_jikuu_n") + 1;
	s.set("seen_jikuu_n", n);
	if (n === 2) {
		await s.narrate("国道の　信号が、青に\nかわった。車は、来ない。");
	} else if (n === 3) {
		s.se("shutter", { pan: -0.9, volume: 0.25 });
		await s.wait(600);
		await s.narrate("とおくで、なにかが\nくずれる　音。");
	} else if (n === 4) {
		s.se("shutter", { pan: -0.7, volume: 0.45 });
		await s.narrate("西の　はしの　街灯が、\nひとつ　消えた。");
		await s.narrate("くずれる　音が、\nちかい。");
	} else if (n >= 5) {
		await s.wait(1400);
		s.se("stairs", { pan: 0.4, volume: 0.4 });
		await s.narrate("……足音。");
		s.set("seen_jikuu_otoko");
		s.show("otoko");
		await s.wait(800);
		await s.narrate("作業着の　男が、\n立っていた。");
		await s.say(null, "……なんで、\nここに　いる", {
			name: OTOKO,
			noVoice: true,
		});
		await s.say(null, "帰れ。いま　すぐ", { name: OTOKO, noVoice: true });
		s.set("seen_jikuu_kaere");
	}
};

/** 調べる もの（中身の あとに 一段 すすむ）。 */
const shiraberu =
	(body: (s: Story) => Promise<void>) =>
	async (s: Story): Promise<void> => {
		if (s.flag("seen_jikuu_kaere")) {
			await tsukamaru(s);
			return;
		}
		await body(s);
		await jikuuStep(s);
	};

/** 北の 階段（歩道橋へ もどる。「帰れ」の あとなら 帰れる）。 */
const kaidan = async (s: Story): Promise<void> => {
	const kaere = !!s.flag("seen_jikuu_kaere");
	jikuuReset(s);
	if (kaere) s.set("seen_jikuu_kaeri");
	await s.warp("kokudo", 28, 2, "up", { se: "stairs" });
	if (!kaere) return;
	// 一息：トラックの 音が 先に もどり、ことばは 遅れて ひとことだけ
	await s.wait(1200);
	s.se("train", { pan: -0.4, volume: 0.6 });
	await s.narrate("……下を、トラックが\nとおっていった。");
	await s.wait(1400);
	await s.say("kiriko", "……うるさいンゴ");
};

export const kokudoUra: MapDef = {
	id: "kokudo_ura",
	name: "こくどう",
	bgm: null,
	outdoor: true,
	outside: "#0c0b09",
	tiles,
	rows,
	// 灯りは ぜんぶ ついている（ファミレス・死んだ じはんき・スタンド・街灯・電光掲示板）
	lights: [
		{ x: 10, y: 5, r: 3, color: "#ffe8b8" }, // ファミレスの 窓
		{ x: 15, y: 5, r: 3, color: "#ffe8b8" },
		{ x: 13, y: 6, r: 2, color: "#ffe8b8" }, // ファミレスの 入口
		{ x: 30, y: 6, r: 1.5, color: "#eef4ff" }, // 死んだ じはんき
		{ x: 16, y: 6, r: 2, color: "#cfe4ff" }, // 電光掲示板
		{ x: 8, y: 12, r: 4, color: "#cfe4ff" }, // スタンドの 前庭
		{ x: 16, y: 11, r: 3, color: "#ffdf9e" }, // 街灯
		{ x: 36, y: 11, r: 3, color: "#ffdf9e" },
	],
	events: [
		{
			id: "hodo_up_n",
			x: 28,
			y: 6,
			trigger: "touch",
			exit: "up",
			through: true,
			run: kaidan,
		},
		{
			id: "famiresu_win",
			x: 9,
			y: 5,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("窓に　あかり。いすが、\nぜんぶ　床に　おりている。");
			}),
		},
		{
			id: "famiresu_hours",
			x: 10,
			y: 5,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("はり紙。\n『24時間営業』");
			}),
		},
		{
			id: "famiresu_door",
			x: 13,
			y: 5,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("入口が　あいている。\n店内放送が　ながれている。");
				await s.narrate("いらっしゃいませ、の\n声は　ない。");
			}),
		},
		{
			id: "famiresu_win2",
			x: 15,
			y: 5,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("テーブルに、湯気の　たつ\nコーヒーが　ならんでいる。");
			}),
		},
		{
			id: "famiresu_back",
			x: 18,
			y: 5,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("通用口が　あいている。\nおくで、なべが　にえている。");
			}),
		},
		{
			id: "shinda_jihanki",
			x: 30,
			y: 6,
			sprite: JP.vending,
			trigger: "talk",
			fixedDir: true,
			run: shiraberu(async (s) => {
				await s.narrate("こわれていた　じはんきに、\nあかりが　ついている。");
			}),
		},
		{
			id: "kokudo_mukou",
			x: 20,
			y: 8,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("国道の　むこう。スタンドに\nあかり。だれも　いない。");
			}),
		},
		npc(
			"otoko",
			27,
			7,
			SAGYOUGI,
			async (s) => {
				await s.say(null, "……はやく", { name: OTOKO, noVoice: true });
			},
			{ dir: "left", when: (st) => !!st.flags.seen_jikuu_otoko },
		),
	],
};
