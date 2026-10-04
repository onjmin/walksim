// 駅前の雑居ビルの屋上。zakkyo のエレベーターで あがる。docs/style-everyday.md・
// docs/dialogue-guide.md。19×11・outdoor・BGM "@tod"。
// 塔屋（エレベーター・階段室）・室外機の列・給水タンク・喫煙所のベンチと吸いがら入れ・手すり。
// 南の手すりから、駅前のロータリーが まっすぐ下に見える。
//
// 時間帯の顔:
//   夕方 … 人はいない（管理人さんは1階）。夕日・ロータリー・室外機がぜんぶ まわっている
//   宵   … 人は出さない。町じゅうの窓・国道のライト・タンクに水のたまる音・口紅の吸いがら・ライター
//   深夜 … 人は出さない。手すりで町の灯りを えらんで見る（駅・線路・国道 → 2回見ると 海）。
//           ベンチにすわれる（seen_suwari_okujo。缶があれば kanLine）。室外機は『９Ｆ』の一台だけ
//   朝   … 管理人さんが水槽の点検（1人）。夜の変化の回収
//
// danchi a_stairs（いちばん上のおどりばで「灯りを　かぞえる」→ 自分の部屋のあおい窓）とは
// 見せ方を分ける: ここは「どの灯りを見るか えらぶ」。見えるのは、ほかの地区で歩いた所の灯り。
//
// 段と回収:
//   ながめ    深夜 seen_okujo_nagame（数）。駅 seen_okujo_eki・線路 seen_okujo_senro・
//             国道 seen_okujo_kokudo・2回見たあと 海 seen_okujo_umi（灯台を知らない人は seen_okujo_nazo）
//             → 四つ見ると seen_okujo_zenbu → 朝 見た所だけ 朝の顔（白い塔・朝の電車・国道の車）
//             宵 seen_okujo_yoru → 深夜の最初の一回「さっきは、あんなに」
//   室外機    宵 seen_okujo_situ_yoru → 深夜『９Ｆ』だけ seen_okujo_9f → 朝 まだ あたたかい
//             （zakkyo annai の 8・9F が読む）
//   吸いがら  夕・宵・深夜 seen_okujo_haizara（宵の口紅 seen_okujo_kuchibeni → 深夜 三本）
//             → 朝 あらってある（zakkyo の管理人さんの灰皿の話＝seen_zakkyo_kanri 2 を読む）
//   ライター  宵 seen_okujo_lighter → 深夜 まだある → 朝 もうない
//   ベンチ    深夜 seen_suwari_okujo → 朝 ひとりぶん つゆが うすい
//   タンク    夕 くさりと南京錠 seen_okujo_tank → 朝 くさりが はずされて『点検中』（seen_zakkyo_kanri 3）
//   階段室    夕・宵・深夜 あかない seen_okujo_tobira → 朝 石で おさえて あけてある
// ほかの地区を読む所（nagame）: ekimae（seen_takushii・seen_kan_eki）・kokudo（seen_hodo_yoru・
//   seen_densou_shinya・truckOoi）・kawara（seen_tekkyo_shinya）・senro（arrive_shinya）・
//   umi（seen_toudai_kairi・seen_toudai_shinya・arrive）。
//
// 出入口: zakkyo のエレベーターから (6,4) 下向き（扉から出た向き）。
//   エレベーター (6,3) を (6,4) から上向きで調べる →「＞＞1 １階」→ zakkyo (11,3) 下向き。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import {
	arrived,
	kanHeld,
	kanLine,
	numFlag,
	shinyaClock,
	truckOoi,
} from "../nostalgia";
import { APART, JP, TOWN } from "../tiles";
import { STN } from "../tiles-station";
import { zen } from "./zakkyo";

// ── エレベーター（屋上の塔屋。かごは いつも ここで待っている） ──
const elevator = async (s: Story): Promise<void> => {
	await s.narrate(`エレベーター。\n階数の　表示は　『${zen("R")}』。`);
	s.se("door", { volume: 0.6 });
	await s.narrate("とびらが　ひらいた。\nのりこむ。");
	for (;;) {
		const i = await s.choose(["＞＞1 １階", "＞＞2 ほかの階", "＞＞3 おりる"], {
			cancel: 2,
		});
		if (i === 1) {
			await s.say("kiriko", "（ほかの　階に、\n用は　ないンゴ）");
			continue;
		}
		if (i === 2) {
			s.se("door", { volume: 0.6 });
			await s.narrate("エレベーターを　おりた。");
			return;
		}
		break;
	}
	s.se("tick", { volume: 0.6 });
	await s.wait(300);
	s.se("hum", { volume: 0.5 });
	await s.fadeOut(700);
	await s.wait(500);
	s.se("hum", { volume: 0.4 });
	await s.wait(500);
	await s.warp("zakkyo", 11, 3, "down", { se: "door" });
};

// ── 南の手すり（ながめ） ──

/** 深夜に見られる所（海は 2回見たあと）。 */
type Muki = "eki" | "senro" | "kokudo" | "umi";
const MUKI_LABEL: Record<Muki, string> = {
	eki: "駅のほう",
	senro: "線路のほう",
	kokudo: "国道のほう",
	umi: "海のほう",
};

/** 海の あたりを ゆうべ 歩いたか（umi のどれかの arrive）。 */
const umiAruita = (s: Story): boolean =>
	arrived(s, "umi", "yu") ||
	arrived(s, "umi", "yoru") ||
	arrived(s, "umi", "shinya");

const miru = async (s: Story, m: Muki): Promise<void> => {
	s.set(`seen_okujo_${m}`);
	if (m === "eki") {
		await s.narrate("駅の　シャッターの　前に、\n街灯が　三つ。");
		if (s.flag("seen_kan_eki"))
			await s.say("kiriko", "（あの　白いのが、\n吾輩の　じはんきンゴ）");
		else await s.narrate("じはんきの　白い　あかりが、\nひとつ。");
		return;
	}
	if (m === "senro") {
		await s.narrate("線路ぞいの　街灯が、\n点線みたいに　のびている。");
		if (s.flag("seen_tekkyo_shinya")) {
			await s.narrate("川の　ところで、\n点線が　とぎれる。");
			await s.say("kiriko", "（鉄橋の、\nくろい　線ンゴ）");
			return;
		}
		if (arrived(s, "senro", "shinya"))
			await s.say("kiriko", "（あの　点線の　上を、\n歩いてきたンゴ）");
		return;
	}
	if (m === "kokudo") {
		await s.narrate("国道の　信号が、だれも\nいないのに　青に　かわる。");
		if (s.flag("seen_densou_shinya"))
			await s.narrate(`電光掲示板の　字が、ちいさく\n『${shinyaClock(s)}』。`);
		if (truckOoi(s))
			await s.say("kiriko", "（トラックも、\nいまは　ねてるンゴ）");
		return;
	}
	// 海（灯台。umi の「ひかって、きえて、また　ひかる」と同じ文で重ねる）
	await s.narrate("国道の　ずっと　むこう、\nまっくらな　ところに　光。");
	await s.narrate("ひかって、きえて、\nまた　ひかる。");
	if (s.flag("seen_toudai_kairi")) {
		await s.say("kiriko", "（……八海里、\nここまで　とどくンゴ）");
		return;
	}
	if (s.flag("seen_toudai_shinya") || umiAruita(s)) {
		await s.say("kiriko", "（……灯台ンゴ）");
		return;
	}
	s.set("seen_okujo_nazo");
	await s.say("kiriko", "（……なんの　光ンゴ）");
};

const nagameShinya = async (s: Story): Promise<void> => {
	const n = numFlag(s, "seen_okujo_nagame");
	if (n === 0) {
		await s.narrate("手すりに、ひじを　ついた。");
		await s.narrate("町の　灯りは、もう\nかぞえられるくらいだ。");
		if (s.flag("seen_okujo_yoru"))
			await s.say("kiriko", "（さっきは、あんなに\nあったンゴ）");
	}
	const list: Muki[] = ["eki", "senro", "kokudo"];
	if (n >= 2) list.push("umi");
	const opts = [
		...list.map((m, i) => `＞＞${i + 1} ${MUKI_LABEL[m]}`),
		`＞＞${list.length + 1} やめておく`,
	];
	const i = await s.choose(opts, { cancel: list.length });
	if (i >= list.length) return;
	s.set("seen_okujo_nagame", n + 1);
	await miru(s, list[i]);
	// 2回見たところで、海のほうの光に気づく（つぎから えらべる）
	if (n + 1 === 2) {
		await s.wait(400);
		await s.narrate("……国道の　ずっと　むこうで、\nなにかが　ひかった。");
		return;
	}
	if (
		!s.flag("seen_okujo_zenbu") &&
		s.flag("seen_okujo_eki") &&
		s.flag("seen_okujo_senro") &&
		s.flag("seen_okujo_kokudo") &&
		s.flag("seen_okujo_umi")
	) {
		s.set("seen_okujo_zenbu");
		await s.say("kiriko", "（……町って、\nこのくらいの　大きさンゴ）");
	}
};

const nagame = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await nagameShinya(s);
		return;
	}
	if (t === "asa") {
		await s.narrate("朝の　町。屋根が、\nぜんぶ　ひかっている。");
		// ゆうべ見た所だけ、朝の顔（二つまで）
		let k = 0;
		if (s.flag("seen_okujo_umi")) {
			k++;
			await s.narrate("海の　ほうに、白い　塔が\nちいさく　見える。");
			await s.say(
				"kiriko",
				s.flag("seen_okujo_nazo")
					? "（ゆうべの　光は、\nあれンゴ）"
					: "（……もう、\nひかってないンゴ）",
			);
		}
		if (s.flag("seen_okujo_eki")) {
			k++;
			await s.narrate("駅に、朝の　電車が\nすべりこんでいく。");
		}
		if (k < 2 && s.flag("seen_okujo_kokudo")) {
			k++;
			await s.narrate("国道は、もう\n車で　つまっている。");
		}
		if (k === 0) await s.narrate("駅の　ロータリーに、\nバスが　入っていく。");
		return;
	}
	if (t === "yoru") {
		s.set("seen_okujo_yoru");
		await s.narrate("町じゅうの　窓に、\nあかりが　ついている。");
		await s.narrate("国道の　ほうで、ライトが\nながれている。");
		// kokudo hodokyo_view の宵（歩道橋の下のライト）を見た人だけ
		if (s.flag("seen_hodo_yoru"))
			await s.say("kiriko", "（歩道橋の　下の、\nあの　ながれンゴ）");
		return;
	}
	// 夕方は 見るたびに 二つの顔（seen_okujo_yu 数）
	const n = numFlag(s, "seen_okujo_yu");
	s.set("seen_okujo_yu", n + 1);
	await s.narrate("駅の　ロータリーが、\nまっすぐ　下に　見える。");
	if (n % 2 === 0) {
		await s.narrate("バスが　まわって、\nタクシーの　列が　ひとつ　すすむ。");
		if (s.flag("seen_takushii"))
			await s.say("kiriko", "（さっきの　運転手さん、\nあの　へんンゴ）");
		return;
	}
	await s.narrate("線路の　むこうに、\n夕日が　しずんでいく。");
};

// ── ベンチ（喫煙所。深夜は すわれる） ──
const suwaru = async (s: Story): Promise<void> => {
	if (s.flag("seen_suwari_okujo")) {
		if (kanHeld(s)) await kanLine(s);
		else await s.narrate("ベンチに　すわって、\nすこし　空を　見た。");
		return;
	}
	await s.narrate("喫煙所の　ベンチ。");
	if (s.flag("seen_okujo_lighter"))
		await s.narrate("すみに、ライターが\nまだ　ある。");
	const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.set("seen_suwari_okujo");
	await s.narrate("ベンチに　すわった。");
	await s.fadeOut(900, "#04060f");
	await s.wait(900);
	await s.fadeIn(900);
	await s.narrate(
		s.flag("seen_okujo_9f")
			? "ブーン、と　『９Ｆ』の\n室外機だけが　まわっている。"
			: "室外機の　音が、\nひとつだけ　している。",
	);
	if (kanHeld(s)) await kanLine(s);
	else await s.narrate("ベンチの　鉄が、\nつめたい。");
	await s.say("kiriko", "……空の　ほうが、\n町より　あかるいンゴ");
};

const bench = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await suwaru(s);
		return;
	}
	if (t === "asa") {
		await s.narrate("ベンチに、夜つゆが\nおりている。");
		if (s.flag("seen_suwari_okujo"))
			await s.narrate("ひとりぶん　だけ、\nつゆが　うすい。");
		if (s.flag("seen_okujo_lighter"))
			await s.narrate("ライターは、もう　ない。");
		return;
	}
	if (t === "yoru") {
		s.set("seen_okujo_lighter");
		await s.narrate("ベンチの　すみに、ライターが\n一つ　わすれてある。");
		return;
	}
	await s.narrate("喫煙所の　ベンチ。タバコの\nにおいが　しみている。");
};

// ── 室外機（札は 2F・3F・4F・5F・6F・8F・9F・10F。7F は空き） ──
const shitsugaiki = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "asa") {
		await s.narrate("室外機は、ぜんぶ\nとまっている。");
		if (s.flag("seen_okujo_9f")) {
			await s.narrate(
				"『９Ｆ』のに　手を　あてると、\nまだ　ほんのり　あたたかい。",
			);
			await s.say("kiriko", "（……夜どおし\nンゴか）");
		}
		return;
	}
	if (t === "shinya") {
		s.set("seen_okujo_9f");
		await s.narrate("まわっているのは、\n『９Ｆ』の　一台だけ。");
		if (s.flag("seen_okujo_situ_yoru"))
			await s.say("kiriko", "（４階も　６階も、\nおしまいンゴ）");
		return;
	}
	if (t === "yoru") {
		s.set("seen_okujo_situ_yoru");
		await s.narrate("まわっているのは、\n『４Ｆ』『６Ｆ』『９Ｆ』。");
		return;
	}
	await s.narrate("室外機が　ならんで、\nぜんぶ　まわっている。");
	await s.narrate("札は　『２Ｆ』『３Ｆ』……\n『７Ｆ』だけ　ない。");
};

// ── タイル（ゆかは APART のコンクリート。物は town.png・station.png の絵を重ねる） ──
//   r  手すり（コンクリートのへり）  H h  塔屋のかべ（上段・下段）  .  屋上のゆか
//   E  エレベーター  q  階段室の扉  a  室外機  Q  給水タンク  B b  ベンチ（左右）  u  吸いがら入れ
const A_FLOOR = APART["."].layers[0];
const A_WALL_LO = APART.h.layers[0];
const C_CONC = "#b4b2aa";
const thing = (base: string, img: string): TileDef => ({
	layers: [base, img],
	color: C_CONC,
	passable: false,
});
const tiles: Record<string, TileDef> = {
	" ": APART[" "],
	r: APART.r,
	H: APART.H,
	h: APART.h,
	".": APART["."],
	E: thing(A_WALL_LO, STN.elevator),
	q: APART.q,
	a: thing(A_FLOOR, JP.gatePillar),
	Q: thing(A_FLOOR, JP.waterTower),
	B: thing(A_FLOOR, TOWN.B.layers[1]),
	b: thing(A_FLOOR, TOWN.b.layers[1]),
	u: thing(A_FLOOR, JP.bucket),
};

const rows = [
	"                   ", // y0
	" rrrrrrrrrrrrrrrrr ", // y1
	" r..HHHHH.aaaa...r ", // y2  室外機 (10-13,2)
	" r..hhEhq........r ", // y3  エレベーター (6,3)・階段室 (8,3)
	" r.............Q.r ", // y4  zakkyo からの着地 (6,4)・給水タンク (15,4)
	" r...............r ", // y5  管理人さん (15,5)朝
	" r.Bb............r ", // y6  ベンチ (3,6)(4,6)
	" r.u.............r ", // y7  吸いがら入れ (3,7)
	" r...............r ", // y8
	" rrrrrrrrrrrrrrrrr ", // y9  南の手すり（ながめ (7-11,9)。駅前のロータリーが下）
	"                   ", // y10
];

export const okujo: MapDef = {
	id: "okujo",
	name: "雑居ビルの屋上",
	bgm: "@tod",
	outdoor: true,
	outside: "#0b0c10",
	tiles,
	rows,
	boxes: [{ x: 0, y: 0, w: 19, h: 11 }],
	lights: [
		{ x: 6, y: 3, r: 2, color: "#e6eef8", only: "yoru,shinya" }, // 塔屋の蛍光灯
	],
	events: [
		// ── 着いたとき（時間帯ごとに一度だけ） ──
		{
			id: "arrive_yu",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu",
			run: async (s) => {
				await s.wait(300);
				await s.narrate("風が　つよい。\n空が、まだ　あかね色だ。");
			},
		},
		{
			id: "arrive_yoru",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(300);
				await s.narrate("町の　灯りが、\n足もとに　ひろがっている。");
				if (arrived(s, "okujo", "yu"))
					await s.say("kiriko", "（夕方と、\nぜんぜん　ちがうンゴ）");
			},
		},
		{
			id: "arrive_shinya",
			x: 2,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(300);
				await s.narrate("風が、つめたい。\n室外機の　音が　ひとつ。");
			},
		},
		{
			id: "arrive_asa",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "asa",
			run: async (s) => {
				await s.wait(300);
				await s.narrate("朝の　光。\nはしごを　のぼる　音がする。");
				// ゆうべ ここで灯りを見た人だけ
				if (numFlag(s, "seen_okujo_nagame") > 0)
					await s.say("kiriko", "（ゆうべは、ここで\n町を　見てたンゴ）");
			},
		},

		// ── 出入口 ──
		{ id: "elevator", x: 6, y: 3, trigger: "talk", run: elevator },

		// ── しらべられるもの ──
		...[7, 8, 9, 10, 11].map((x) => ({
			id: `nagame_${x}`,
			x,
			y: 9,
			trigger: "talk" as const,
			run: nagame,
		})),
		...[3, 4].map((x) => ({
			id: `bench_${x}`,
			x,
			y: 6,
			trigger: "talk" as const,
			run: bench,
		})),
		...[10, 11, 12, 13].map((x) => ({
			id: `shitsugaiki_${x}`,
			x,
			y: 2,
			trigger: "talk" as const,
			run: shitsugaiki,
		})),
		// 吸いがら入れ（赤いバケツ）。宵の口紅一本（seen_okujo_kuchibeni）→ 深夜 三本 →
		// 朝 あらってある（夕・宵・深夜に見た人だけ。管理人さんの灰皿の話を聞いた人にはキリコ）
		{
			id: "haizara",
			x: 3,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const kanri2 = numFlag(s, "seen_zakkyo_kanri") >= 2;
				if (t === "asa") {
					if (s.flag("seen_okujo_haizara")) {
						await s.narrate(
							"バケツの　水が　すんでいる。\n吸いがらは、一本も　ない。",
						);
						if (kanri2)
							await s.say("kiriko", "（けっきょく、\n管理人さんンゴ）");
						return;
					}
					await s.narrate("赤い　バケツ。\n水が　すんでいる。");
					return;
				}
				s.set("seen_okujo_haizara");
				if (t === "shinya") {
					await s.narrate(
						s.flag("seen_okujo_kuchibeni")
							? "口紅の　ついたのが、\n三本に　なっている。"
							: "吸いがらの　山。口紅の\nついたのも　まじっている。",
					);
					return;
				}
				if (t === "yoru") {
					s.set("seen_okujo_kuchibeni");
					await s.narrate(
						"吸いがらが　ふえている。\n口紅の　ついたのが　一本。",
					);
					return;
				}
				await s.narrate("赤い　バケツ。『吸いがら入れ』\n水が　にごっている。");
				if (kanri2)
					await s.say("kiriko", "（管理人さんの　いってた\nやつンゴ）");
			},
		},
		// 給水タンク。夕 くさりと南京錠（seen_okujo_tank）→ 宵 水のたまる音 → 深夜 しずか →
		// 朝 点検中（くさりを見た人には「はずされている」。水槽の点検の話を聞いた人にはキリコ）
		{
			id: "tank",
			x: 15,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_okujo_tank")
							? "はしごの　くさりが、\nはずされている。"
							: "給水タンクの　はしごに、\nだれかが　のぼった　あと。",
					);
					await s.narrate("『点検中』の　札。");
					if (numFlag(s, "seen_zakkyo_kanri") >= 3)
						await s.say("kiriko", "（ほんとに、朝から\nやってるンゴ）");
					return;
				}
				if (t === "shinya") {
					await s.narrate("タンクは　しずか。\n手を　あてると、つめたい。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("タンクの　中で、水の\nたまる　音が　している。");
					return;
				}
				s.set("seen_okujo_tank");
				await s.narrate("給水タンク。『飲料水』の\n字が、夕日で　赤い。");
				await s.narrate("はしごに、くさりと\n南京錠。");
			},
		},
		// 屋上がわの階段室の扉（こちらからは あかない）→ 朝 石で おさえて あけてある
		{
			id: "tobira",
			x: 8,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("階段室の　扉が、石で\nおさえて　あけてある。");
					if (s.flag("seen_okujo_tobira"))
						await s.say("kiriko", "（きのうは、\nあかなかったンゴ）");
					return;
				}
				s.set("seen_okujo_tobira");
				await s.narrate("階段室の　鉄の扉。\nこっちからは、あかない。");
				if (t === "shinya")
					await s.narrate("すきまから、非常口の\nみどりが　もれている。");
			},
		},

		// ── 人（朝だけ。水槽の点検の管理人さん） ──
		{
			id: "kanrinin_asa",
			x: 15,
			y: 5,
			sprite: "pub:sprites/mob_ojiichan.png",
			dir: "up",
			trigger: "talk",
			when: (st) => st.flags.tod === "asa",
			run: async (s) => {
				const n = numFlag(s, "seen_okujo_kanri_asa");
				if (n < 2) s.set("seen_okujo_kanri_asa", n + 1);
				const say = (text: string) => s.say(null, text, { name: "管理人さん" });
				if (n === 0) {
					// 夕方に会った人には「きのうの　子」
					if (numFlag(s, "seen_zakkyo_kanri") > 0)
						await say("おや、きのうの　子だ。\nはやいねえ。");
					else await say("おはよう。いま、\n水槽の　点検ちゅうでね。");
					return;
				}
				if (n === 1) {
					await say("灰皿、けさ　あらったよ。\n……ほんとに　だれも　やらん。");
					return;
				}
				await say("水は　だいじょうぶ。\nきょうも　のめるよ。");
			},
		},
	],
};
