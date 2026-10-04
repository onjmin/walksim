// 駅前の雑居ビル（1階ホール）。えきまえ の北がわ、スーパーのとなりの細いビル。
// docs/style-everyday.md・docs/dialogue-guide.md。17×7・室内（outdoor なし）・BGM "@tod"。
// 2階から上はテナント（歯科・塾・雀荘・税理士・スナック・空き・整体・事務所・囲碁）。
// 入口は夜も開いている（上の階に夜の店があるので、ビルの戸は閉めない）。
// エレベーターで屋上（okujo）へ行ける。ふつうのエレベーターとして書く（怪異は書かない）。
//
// 時間帯の顔:
//   夕方 … 管理人さん（モップ。3段）と出前の人（4階の雀荘へ。エレベーター待ち）の2人
//   宵   … 人は出さない。上からカラオケ（6F）・小窓のカーテン・チラシの山・かごの香水
//   深夜 … 人は出さない。蛍光灯のうなり・階段室にかぎ・かさが一本・朝刊はまだ
//   朝   … 夜の変化の回収（7F の前の朝刊・『みゆき』のかさ・からの箱・『屋上に　います』）
//
// 段と回収:
//   管理人さん  kanrinin（seen_zakkyo_kanri 数 1→屋上 2→灰皿 3→水槽の点検）
//              → kanri_mado 朝『屋上に　います』・harigami 朝の手書き・okujo haizara/tank/kanrinin_asa
//   7F の口    yuubin（夕・宵・深夜 seen_zakkyo_tape）→ 朝 7F の前にだけ朝刊が一部おちている
//   かさ        kasa（深夜 seen_zakkyo_kasa1）→ 朝『みゆき』のシール
//   チラシ      gomibako（宵・深夜 seen_zakkyo_chirashi）→ 朝 からっぽ（apart の pizza を読む）
//   カラオケ    arrive_yoru（done:zakkyo:arrive_yoru）→ harigami 深夜「もう　きこえない」
//   香水        elevator 宵のかご（seen_zakkyo_kousui）→ 深夜のかご
//   9F         okujo shitsugaiki 深夜（seen_okujo_9f）→ annai の 8・9F（深夜・朝）
//   階段室      kaidan 夕・宵の『夜９時に』（seen_zakkyo_kaidan9）→ 宵の時計で かぎ → 朝 もう あいている
// ほかの地区を読む所: demae（senro の出前の自転車 seen_demae_senro）・
//   gomibako（apart mybox の seen_pizza_yoru・got_pizza_chirashi）。
//
// 出入口（向きをそろえる）:
//   ekimae (15,4) を上へ踏む → ここ (8,5) 上向き。出口 (8,6) を下へ踏む → ekimae (15,5) 下向き。
//   出口 (8,6) は左右と下が虚空なので、上 (8,5) からしか踏めない。
//   エレベーター (11,2) は前の (11,3) から上向きで調べる → okujo (6,4) 下向き（扉から出た向き）。
//   okujo から戻ると (11,3) 下向き。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { arrived, numFlag, strFlag, yoruClock } from "../nostalgia";
import { APART, home, SHOP } from "../tiles";
import { STN } from "../tiles-station";

// ── エレベーターのボタンと各階（のちの寄り道でも使う。案内板・郵便受け・室外機の札とそろえる） ──

/** ボタンのならび（1〜10・R）。かごの中のパネルは 左の列 1〜5・右の列 6〜10、その上に R。 */
export const ZAKKYO_BUTTONS = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"R",
] as const;

/** 各階のテナント（1階はこのホールと管理室・R は屋上＝okujo）。 */
export const ZAKKYO_TENANTS: Record<(typeof ZAKKYO_BUTTONS)[number], string> = {
	"1": "管理室",
	"2": "さくら歯科",
	"3": "すずらん学習会",
	"4": "麻雀　東南荘",
	"5": "やまだ税理士事務所",
	"6": "スナック　みゆき",
	"7": "テナント募集",
	"8": "ほぐし処",
	"9": "ひかり企画",
	"10": "囲碁サロン",
	R: "屋上",
};

/** 半角の英数を全角に（案内板・表示の字）。 */
export const zen = (t: string): string =>
	t.replace(/[0-9A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0));

/**
 * 1階で見る、エレベーターの階数表示（かごのいる階）。
 * 夕＝出前の人が待っている間は 4（雀荘のお客がおさえている）・それ以外は 3（塾）、
 * 宵＝6（スナック）、深夜＝1、朝＝R（管理人さんが水槽の点検であがった）。
 */
const hyouji = (s: Story): string => {
	const t = s.flag("tod");
	if (t === "yu") return demaeIru(s) ? "4" : "3";
	if (t === "yoru") return "6";
	if (t === "asa") return "R";
	return "1";
};

/** 夕方、出前の人がまだホールにいるか（いっしょに乗ったら いなくなる）。 */
const demaeIru = (s: Story): boolean =>
	s.flag("tod") === "yu" && !s.flag("seen_zakkyo_demae_nori");

/** かごの中の一言（時間帯がかわったときに一度だけ。seen_zakkyo_kago＝最後に言った時間帯）。 */
const kagoNoHitokoto = async (s: Story): Promise<void> => {
	const t = strFlag(s, "tod") ?? "yu";
	if (strFlag(s, "seen_zakkyo_kago") === t) return;
	s.set("seen_zakkyo_kago", t);
	if (t === "yoru") {
		s.set("seen_zakkyo_kousui");
		await s.narrate("かごの　中に、\n香水の　においが　のこっている。");
		return;
	}
	if (t === "shinya") {
		await s.narrate("かごの　蛍光灯が、\nジー、と　鳴っている。");
		if (s.flag("seen_zakkyo_kousui"))
			await s.narrate("香水の　においは、\nもう　ほとんど　しない。");
		return;
	}
	if (t === "asa") {
		await s.narrate("かごの　ゆかに、\nモップの　水の　あと。");
		return;
	}
	await s.narrate("かごの　かべに、\n『定員９名　６００ｋｇ』");
};

/** かごが上へ（ボタン・うなり・とびら）。 */
const noboru = async (s: Story): Promise<void> => {
	s.se("tick", { volume: 0.6 });
	await s.wait(300);
	s.se("hum", { volume: 0.5 });
	await s.fadeOut(700);
	await s.wait(500);
	s.se("hum", { volume: 0.4 });
	await s.wait(500);
};

/** 1階のエレベーター（前の (11,3) から上向きで調べる）。 */
const elevator = async (s: Story): Promise<void> => {
	const d = hyouji(s);
	await s.narrate(`エレベーター。\n階数の　表示は　『${zen(d)}』。`);
	if (s.flag("tod") === "asa" && numFlag(s, "seen_zakkyo_kanri") >= 3)
		await s.say("kiriko", "（管理人さん、\nもう　上ンゴ）");
	if (d !== "1") {
		const i = await s.choose(["＞＞1 よぶ", "＞＞2 やめておく"], {
			cancel: 1,
		});
		if (i !== 0) return;
		s.se("tick", { volume: 0.6 });
		await s.narrate("表示の　数字が、\nひとつずつ　へってくる。");
	}
	s.se("door", { volume: 0.6 });
	const demae = demaeIru(s);
	if (demae) await s.narrate("出前の　人と、\nいっしょに　のりこんだ。");
	else await s.narrate("とびらが　ひらいた。\nのりこむ。");
	await kagoNoHitokoto(s);
	if (!s.flag("seen_zakkyo_botan")) {
		s.set("seen_zakkyo_botan");
		await s.narrate("ボタンは　１から　１０と、Ｒ。\n二列に　ならんでいる。");
	}
	for (;;) {
		const i = await s.choose(
			["＞＞1 屋上（Ｒ）", "＞＞2 ほかの階", "＞＞3 おりる"],
			{ cancel: 2 },
		);
		if (i === 1) {
			await s.say("kiriko", "（ほかの　階に、\n用は　ないンゴ）");
			continue;
		}
		if (i === 2) {
			if (demae) {
				s.set("seen_zakkyo_demae_nori");
				await s.narrate("出前の　人だけ、\n上へ　あがっていった。");
				return;
			}
			s.se("door", { volume: 0.6 });
			await s.narrate("エレベーターを　おりた。");
			return;
		}
		break;
	}
	if (demae) {
		s.set("seen_zakkyo_demae_nori");
		s.se("tick", { volume: 0.6 });
		await s.wait(400);
		s.se("door", { volume: 0.5 });
		await s.narrate("４階で、おかもちが\nすっと　おりていった。");
	}
	await noboru(s);
	await s.warp("okujo", 6, 4, "down", { se: "door" });
};

// ── 案内板（見るたびに 二つの階ずつ。上の階へ すすんで、ひとまわりで もどる） ──
const ANNAI: (typeof ZAKKYO_BUTTONS)[number][][] = [
	["2", "3"],
	["4", "5"],
	["6", "7"],
	["8", "9"],
	["10"],
];
const fudaLine = (f: (typeof ZAKKYO_BUTTONS)[number]): string =>
	`『${zen(f)}Ｆ　${ZAKKYO_TENANTS[f]}』`;

const annai = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	const n = numFlag(s, "seen_zakkyo_annai");
	s.set("seen_zakkyo_annai", n + 1);
	const k = n % ANNAI.length;
	if (k === 0) await s.narrate("テナントの　案内板。");
	await s.narrate(ANNAI[k].map(fudaLine).join("\n"));
	if (k === 0) {
		if (t === "yu") await s.say("kiriko", "（歯医者……\n吾輩は　パスンゴ）");
		else if (t === "asa")
			await s.narrate("『さくら歯科』の　札に、\n『本日　９時から』の　紙。");
		return;
	}
	if (k === 1) {
		// 夕方の出前の行き先
		if (numFlag(s, "seen_zakkyo_demae") > 0 && t === "yu")
			await s.say("kiriko", "（ラーメンの　行き先\nンゴね）");
		return;
	}
	if (k === 2) {
		// 7F だけ白い紙（郵便受けのテープと対）
		await s.narrate("『７Ｆ』の　ところだけ、\n白い　紙が　はってある。");
		if (t === "yoru" && arrived(s, "zakkyo", "yoru"))
			await s.say("kiriko", "（上の　カラオケは、\n６階ンゴね）");
		return;
	}
	if (k === 3) {
		// 9F（okujo の室外機が深夜に一台だけ まわっていた階）
		if (!s.flag("seen_okujo_9f")) return;
		if (t === "shinya") await s.say("kiriko", "（……あの　室外機の\n階ンゴ）");
		else if (t === "asa")
			await s.say("kiriko", "（夜どおし、\nおつかれさまンゴ）");
		return;
	}
	await s.narrate("その上は、\nもう　なにも　書いていない。");
};

// ── 郵便受け（三つの列。どこを調べても同じ口の列） ──
const yuubin = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "asa") {
		await s.narrate("どの　口にも、朝刊が\nささっている。");
		// 7F のテープ（夕・宵・深夜に見た人だけ）
		if (s.flag("seen_zakkyo_tape")) {
			await s.narrate("『７Ｆ』の　前にだけ、一部\nゆかに　おちている。");
			await s.say("kiriko", "（……だれも　いない\n階ンゴ）");
		}
		return;
	}
	s.set("seen_zakkyo_tape");
	if (t === "yoru") {
		await s.narrate("『４Ｆ』の　口に、出前の\nメニューが　ささっている。");
		await s.narrate("『７Ｆ』の　口は、\nガムテープで　ふさいである。");
		return;
	}
	if (t === "shinya") {
		await s.narrate("朝刊は、まだ　来ていない。");
		await s.narrate("『７Ｆ』の　テープに、\nうすく　ほこり。");
		return;
	}
	await s.narrate("ぎんいろの　郵便受けが、\nならんでいる。");
	await s.narrate("『７Ｆ』の　口だけ、\nガムテープで　ふさいである。");
};

// ── タイル（APART の廊下と同じコンクリート。かべの物は station.png・home.png の絵を重ねる） ──
//   H h  かべ（上段・下段）  .  コンクリートのゆか  D  出口のマット（南。warp）
//   M  管理室の小窓  K  テナントの案内板  P  はり紙  B  郵便受け  E  エレベーター
//   S  階段室の鉄の扉  g  チラシの箱  u  かさ立て  x  消火器
const A_FLOOR = APART["."].layers[0];
const A_WALL_LO = APART.h.layers[0];
const C_CONC = "#b4b2aa";
const onWall = (img: string): TileDef => ({
	layers: [A_WALL_LO, img],
	color: C_CONC,
	passable: false,
});
const onFloor = (img: string): TileDef => ({
	layers: [A_FLOOR, img],
	color: C_CONC,
	passable: false,
});
const tiles: Record<string, TileDef> = {
	" ": APART[" "],
	H: APART.H,
	h: APART.h,
	".": APART["."],
	B: APART.B,
	u: APART.u,
	D: SHOP.D,
	M: onWall(home(0, 1)),
	K: onWall(STN.timetableFrame),
	P: onWall(STN.notice),
	E: onWall(STN.elevator),
	S: onWall(STN.northDoor),
	g: onFloor(home(6, 3)),
	x: onFloor(home(5, 4)),
};

const rows = [
	"                 ", // y0
	" HHHHHHHHHHHHHHH ", // y1
	" hMhKhPBBBhEhhSh ", // y2  管理室の小窓 (2,2)・案内板 (4,2)・はり紙 (6,2)・郵便受け (7-9,2)・エレベーター (11,2)・階段室 (14,2)
	" .........g..... ", // y3  チラシの箱 (10,3)・出前の人 (12,3)夕・okujo からの着地 (11,3)
	" ............... ", // y4  管理人さん (2,4)夕
	" u.............x ", // y5  かさ立て (1,5)・消火器 (15,5)・ekimae からの着地 (8,5)
	"        D        ", // y6  出口 (8,6) → ekimae (15,5)
];

const KANRININ = "pub:sprites/mob_ojiichan.png";
const DEMAE = "pub:sprites/mob_worker.png";

export const zakkyo: MapDef = {
	id: "zakkyo",
	name: "駅前の雑居ビル",
	bgm: "@tod",
	outside: "#14120e",
	tiles,
	rows,
	lights: [{ x: 8, y: 4, r: 3, color: "#e6eef8" }], // ホールの蛍光灯
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
				await s.narrate("上の　ほうから、歯医者の\nキィーン、という　音。");
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
				await s.narrate("上の　ほうから、カラオケが\nすこし　おりてくる。");
				// 夕方の歯医者の音を聞いた人だけ
				if (arrived(s, "zakkyo", "yu"))
					await s.say("kiriko", "（歯医者の　音より、\nこっちが　いいンゴ）");
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
				s.se("hum", { volume: 0.4 });
				await s.narrate("ホールの　蛍光灯が、\nジー、と　鳴っている。");
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
				await s.narrate("ホールの　蛍光灯は、\n朝の光で　うすい。");
				// ゆうべ（宵・深夜）ここに来た人だけ
				if (arrived(s, "zakkyo", "yoru") || arrived(s, "zakkyo", "shinya"))
					await s.narrate("上の　ほうは、\nまだ　しずかだ。");
			},
		},

		// ── 出入口 ──
		{
			id: "deguchi",
			x: 8,
			y: 6,
			trigger: "touch",
			through: true,
			run: async (s) => {
				await s.warp("ekimae", 15, 5, "down", { se: "door" });
			},
		},
		{
			id: "elevator",
			x: 11,
			y: 2,
			trigger: "talk",
			run: elevator,
		},

		// ── しらべられるもの ──
		{ id: "annai", x: 4, y: 2, trigger: "talk", run: annai },
		...[7, 8, 9].map((x) => ({
			id: `yuubin_${x}`,
			x,
			y: 2,
			trigger: "talk" as const,
			run: yuubin,
		})),
		// 管理室の小窓。管理人さんの不在の段（夕 受付中 → 宵 カーテン → 深夜 連絡先 →
		// 朝『屋上に　います』。水槽の点検の話＝seen_zakkyo_kanri 3 を聞いた人にだけ キリコ）
		{
			id: "kanri_mado",
			x: 2,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					await s.narrate(
						"小窓に、カーテン。\n『本日の　受付は　おわりました』",
					);
					return;
				}
				if (t === "shinya") {
					await s.narrate("カーテンの　すきまは、\nまっくら。");
					await s.narrate("小窓の　下に、\n『緊急連絡先』の　紙。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"カーテンは　しまったまま。\n『屋上に　います』の　札。",
					);
					if (numFlag(s, "seen_zakkyo_kanri") >= 3)
						await s.say("kiriko", "（水槽の　点検ンゴね）");
					return;
				}
				await s.narrate("管理室の　小窓。\n『受付　９時〜１８時』");
			},
		},
		// はり紙。夕・宵は二枚（2回目で下の一枚）。深夜は宵のカラオケの回収、
		// 朝は管理人さんの手書き（灰皿の話＝seen_zakkyo_kanri 2 を聞いた人にだけ キリコ）
		{
			id: "harigami",
			x: 6,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("はり紙。\n『カラオケは　夜２時まで』");
					if (arrived(s, "zakkyo", "yoru"))
						await s.narrate("上からの　歌は、\nもう　きこえない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("『おタバコは　屋上の　灰皿で』\nの　はり紙。");
					await s.narrate(
						"その下に、マジックの\n手書きで　『あらって　ください』",
					);
					if (numFlag(s, "seen_zakkyo_kanri") >= 2)
						await s.say("kiriko", "（管理人さんの　字\nンゴ）");
					return;
				}
				if (!s.flag("seen_zakkyo_hari")) {
					s.set("seen_zakkyo_hari");
					await s.narrate(
						"はり紙。『館内　禁煙。\nおタバコは　屋上の　灰皿で』",
					);
					return;
				}
				await s.narrate("その下に、もう一枚。\n『カラオケは　夜２時まで』");
				if (t === "yoru")
					await s.say("kiriko", "（あと　五時間くらい\nあるンゴ）");
			},
		},
		// 階段室の鉄の扉。夕『夜９時に　かぎを』→ 宵は町の時計（yoruClock）で あいている／かぎ →
		// 深夜 かぎ・非常口のあかり → 朝 もう あいている（『夜９時に』を見た人にだけ キリコ）
		{
			id: "kaidan",
			x: 14,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("階段室の　扉は、\nかぎが　かかっている。");
					await s.narrate("『非常口』の　みどりの\nあかりだけ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("階段室の　扉が、\nもう　あいている。");
					if (s.flag("seen_zakkyo_kaidan9"))
						await s.say("kiriko", "（だれかが　もう、\nかぎを　あけたンゴ）");
					return;
				}
				s.set("seen_zakkyo_kaidan9");
				await s.narrate("階段室の　鉄の扉。\n『夜９時に　かぎを　かけます』");
				if (t === "yoru") {
					if (yoruClock(s) >= "21:00") {
						await s.narrate("ノブを　まわすと、\nもう　かぎが　かかっていた。");
						return;
					}
					await s.narrate("まだ、あいている。\n上から、つめたい　風。");
					return;
				}
				await s.say("kiriko", "（１０階まで、のぼる\n気は　しないンゴ）");
			},
		},
		// かさ立て。夕 五本 → 宵 三本 → 深夜 一本（seen_zakkyo_kasa1）→ 朝 その一本に『みゆき』
		{
			id: "kasa",
			x: 1,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (s.flag("seen_zakkyo_kasa1")) {
						await s.narrate(
							"のこった　一本の　もち手に、\n『みゆき』の　シール。",
						);
						await s.say("kiriko", "（６階の　お店の\nかさンゴ）");
						return;
					}
					await s.narrate("かさ立てに、\nビニールがさが　一本。");
					return;
				}
				if (t === "shinya") {
					s.set("seen_zakkyo_kasa1");
					await s.narrate("ビニールがさが、\n一本だけ　のこっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("かさ立て。\nビニールがさが　三本。");
					return;
				}
				await s.narrate("かさ立て。\nビニールがさが　五本。");
				await s.say("kiriko", "（どれも　おなじ\n顔ンゴ）");
			},
		},
		// チラシの箱。宵・深夜に山を見た人（seen_zakkyo_chirashi）だけ、朝「からっぽ」。
		// apart mybox のピザやのチラシ（seen_pizza_yoru・got_pizza_chirashi）を読む
		{
			id: "gomibako",
			x: 10,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (s.flag("seen_zakkyo_chirashi")) {
						await s.narrate("チラシの　箱が、\nからっぽに　なっている。");
						return;
					}
					await s.narrate("『不要な　チラシは\nこちらへ』の　箱。からっぽだ。");
					return;
				}
				if (t === "yoru") {
					s.set("seen_zakkyo_chirashi");
					await s.narrate("チラシの　箱が、\nいまにも　あふれそうだ。");
					await s.narrate("いちばん上に、ピザやの\n『よる11時まで』。");
					if (s.flag("seen_pizza_yoru"))
						await s.say("kiriko", "（……まだ、\nまにあうンゴ）");
					return;
				}
				if (t === "shinya") {
					s.set("seen_zakkyo_chirashi");
					await s.narrate(
						"チラシの　山。ピザやの\n『よる11時まで』が　いちばん上。",
					);
					if (s.flag("got_pizza_chirashi"))
						await s.say("kiriko", "（吾輩のは、\nポケットの　中ンゴ）");
					return;
				}
				await s.narrate("『不要な　チラシは\nこちらへ』の　箱。");
				await s.narrate("ピザやの　チラシが、\n三まい　かさなっている。");
			},
		},

		// ── 人（夕方だけ。宵・深夜は出さない） ──
		// 管理人さん（3段＋待機。seen_zakkyo_kanri 数）。屋上の許し → 灰皿 → あしたの水槽の点検
		{
			id: "kanrinin",
			x: 2,
			y: 4,
			sprite: KANRININ,
			dir: "down",
			trigger: "talk",
			when: (st) => st.flags.tod === "yu",
			run: async (s) => {
				const n = numFlag(s, "seen_zakkyo_kanri");
				if (n < 3) s.set("seen_zakkyo_kanri", n + 1);
				const say = (text: string) => s.say(null, text, { name: "管理人さん" });
				if (n === 0) {
					await say("おや、こんばんは。\n……どこの　お店の　子？");
					await s.say("kiriko", "……さんぽンゴ");
					await say("屋上なら、あがって　いいよ。\n手すりには　のらんでね。");
					return;
				}
				if (n === 1) {
					await say("屋上の　灰皿ね、\nだあれも　あらわないの。");
					await say("けっきょく、わしよ。");
					return;
				}
				if (n === 2) {
					await say("あしたは　朝から、\n屋上の　水槽の　点検でね。");
					await say("はやく　ねなきゃ　いかんの。\n……いかんのよ。");
					return;
				}
				await say("モップの　バケツ、\nどこ　やったかね。");
			},
		},
		// 出前の人（4階の雀荘へ。エレベーター待ち。いっしょに乗ると いなくなる＝seen_zakkyo_demae_nori）。
		// senro の出前の自転車（seen_demae_senro）を見た人には、キリコが気づく
		{
			id: "demae",
			x: 12,
			y: 3,
			sprite: DEMAE,
			dir: "up",
			trigger: "talk",
			when: (st) => st.flags.tod === "yu" && !st.flags.seen_zakkyo_demae_nori,
			run: async (s) => {
				const n = numFlag(s, "seen_zakkyo_demae");
				if (n < 2) s.set("seen_zakkyo_demae", n + 1);
				const say = (text: string) => s.say(null, text, { name: "出前の人" });
				if (n === 0) {
					await say("４階。……ここの　エレベーター、\nいっつも　上に　いるの。");
					if (s.flag("seen_demae_senro"))
						await s.say("kiriko", "（さっき　ぬいていった\nプロンゴ）");
					return;
				}
				if (n === 1) {
					await say(
						"チャーシューめん　三つ。\nマージャンの　人は、よく　食う。",
					);
					await say("のびても　だあれも\n文句　いわないけどね。");
					return;
				}
				await say("……まだ　おりてこない。");
			},
		},
	],
};
