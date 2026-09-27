// 黄色い部屋（Backrooms Level 0）。DESIGN §4・docs/content-briefs.md「world: yellow」。
// 26×18 の均質迷路。style-spaces §2 の例外＝黒の海でなく「どこまでも同じ」で作る。
// tint 黄・ambient dust・BGM deep2。
//
// 座標の凍結（統合仕様）: 着地 (3,2)／出口 touch (3,1) → hub (4,2)。
//
// 見どころ:
// - おんJマンのポスターの反復（1枚だけ逆向き → note exit8）
// - はり紙「出口は　こちら」（二度目から1文字違い。考察バイト技法5・答え合わせしない）
// - うなる自販機（se hum）・消えたモニター（調べた回数のカウンタで note akaiheya）
// - 原住民 (´・ω・｀)・テト（唯一の事務椅子。初回／考察／待機の3層＋rec_a 反応）
// - ミャウミャウ目撃①（長いろうかの突き当たり。まばたきで消える → seen_myau1）
// - 最奥の机に レコードA（got_rec_a）
// - 隠し: 無印の通れるかべ×2（3×3の小部屋のミニワイ／最奥からの近道）
//
// このマップが立てるフラグ:
//   got_rec_a / seen_myau1 / found_miniwai / seen_genju / seen_teto /
//   seen_teto_kosatsu / seen_teto_rec / seen_y_lights / seen_y_kanban /
//   seen_y_vending / seen_y_monitor（数・調べた回数）
// このマップが呼ぶノート: yellow / exit8 / akaiheya / myaumyau / miniwai

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { npc, warp } from "../helpers";
import { SPR } from "../sprites";
import { base, basePx, PROPS } from "../tiles";

// ───────────────── タイル ─────────────────
// 黄ばんだ壁紙（H 上段 / h 下段の面）と金のじゅうたん。u は「見た目はかべ・通れる」隠し。

const CARPET = base(5, 47); // 金のじゅうたん＝黄ばんだカーペット
const WALL_UP = base(1, 77);
const WALL_LOW = base(1, 78);
const C_WALL = "#d8cf9e";
const C_CARPET = "#c0a030";

const wall = (...layers: string[]): TileDef => ({
	layers,
	color: C_WALL,
	passable: false,
});
const carpet = (...over: string[]): TileDef => ({
	layers: [CARPET, ...over],
	color: C_CARPET,
	passable: true,
});

const tiles: Record<string, TileDef> = {
	H: wall(WALL_UP),
	h: wall(WALL_LOW),
	".": carpet(),
	";": carpet(base(5, 12)), // 水たまり（しめったカーペット）
	"~": { layers: [base(5, 46)], color: "#c02020", passable: true }, // 隠し部屋の赤いじゅうたん
	u: { layers: [WALL_UP], color: C_WALL, passable: true }, // 隠し: かべに見えるが通れる（無印）
	D: { layers: [WALL_LOW, base(7, 61, 1, 2)], color: C_WALL, passable: true }, // hub への扉
	E: wall(WALL_LOW, base(7, 61, 1, 2)), // どこにもつながらない扉
	Q: wall(WALL_LOW, basePx(64, 1446)), // おんJマンのポスター（同じ絵の反復）
	N: wall(WALL_LOW, PROPS.notice), // はり紙
	M: wall(WALL_LOW, PROPS.monitor), // 消えたモニター
	V: wall(WALL_UP, PROPS.vending), // うなる自販機
	t: { layers: [CARPET, base(2, 108)], color: C_CARPET, passable: false }, // じむ机
	n: { layers: [CARPET, base(2, 109)], color: C_CARPET, passable: false }, // いす
	r: { layers: [CARPET, base(3, 109)], color: C_CARPET, passable: false }, // 事務椅子（テトの席）
	x: { layers: [CARPET, base(4, 123)], color: C_CARPET, passable: false }, // 段ボール
};

// ───────────────── マップ（26×18） ─────────────────
// 入口ホール（左上）→ 北のろうか（y3）→ 中央のテトの部屋 → 南の長いろうか（y14）→ 最奥（右）。
// 行き止まりには必ず1つ「見るもの」（ポスター・モニター・水たまり）。

const rows = [
	"HHHhHHHHHHHHHHHHHHHHHHHHHH", // y0
	"HhQDhHHHHHHHHHHHHhhhHHHHHH", // y1  ポスター① (2,1)・扉 (3,1) → hub
	"H....hhhQhhhhhhQH~~~HHHHHH", // y2  ポスター② (8,2)・③ (15,2)・隠し部屋 x17-19
	"H...............u~~~HHHHHH", // y3  北のろうか。隠しのかべ (16,3)・ミニワイ (18,3)
	"H....HHHHH.HHHHHH~~xHHHHHH", // y4  だんボールの巣 (19,4)
	"HH.HHHHHHH.HHHHHHHHHHHHHHH", // y5  スイッチ (4,5)
	"HV.hhhNhhh.HHHHHHHHHHHHHHH", // y6  自販機 (1,6)・はり紙 (6,6)
	"HH.........HHHHHHHHMHHHHHH", // y7  モニター (19,7)
	"HH;HH.HHhh.hEQhHHHH.HHHHHH", // y8  開かない扉 (12,8)・逆向きポスター (13,8)
	"HH.HH;HH......xHHHH.HhhhhH", // y9  水たまりの行き止まり (5,9)・だんボール (14,9)
	"HH.HHHHH...r...hhhh.u.tt.H", // y10 テトの事務椅子 (11,10)・隠しの近道 (20,10)・机 (22,10)(23,10)
	"Hh.hHHHH............H....H", // y11 テトの部屋 → 東のろうか → 最奥の部屋
	"Hx..HHHH.......HHHHHHn...H", // y12 だんボール (1,12)・たおれた椅子 (21,12)
	"Hn..hhhQhhhh.hhhhhhhhhh.HH", // y13 原住民の椅子 (1,13)・ポスター④ (7,13)
	"H..............;........HH", // y14 南の長いろうか。ミャウミャウ (22,14)
	"H..xHH.;..;.HHHHHHHHHHHHHH", // y15 ひろいホール x6-11
	"HHHHHHHHH.HHHHHHHHHHHHHHHH", // y16 袋小路 (9,16)
	"HHHHHHHHHHHHHHHHHHHHHHHHHH", // y17
];

// ───────────────── 場面 ─────────────────

/** ミャウミャウ目撃①（長いろうかの突き当たり。まばたきの間に消える）。 */
const myauScene = async (s: Story): Promise<void> => {
	if (s.flag("seen_myau1")) return;
	s.set("seen_myau1");
	await s.narrate("ろうかの　つきあたりに、\nだれか　立っている。");
	await s.wait(600);
	await s.say("myaumyau", "……侵略するぷ", {
		name: "？？？",
		noPortrait: true,
	});
	await s.fadeOut(150);
	s.hide("myau1");
	await s.fadeIn(150);
	await s.narrate("――まばたきの間に、\nいなくなっていた。");
	await s.say("kiriko", "……いまの、だれンゴ");
	await s.note("myaumyau");
};

/** 蛍光灯がいっせいにまたたく（深部のしきい。note yellow）。 */
const lightsScene = async (s: Story): Promise<void> => {
	if (s.flag("seen_y_lights")) return;
	s.set("seen_y_lights");
	s.se("hum");
	await s.wait(400);
	await s.narrate("蛍光灯が、いっせいに\nまたたいた。");
	await s.fadeOut(250);
	await s.fadeIn(250);
	await s.narrate("……あかりは、もどった。\nおなじ　ろうかが、つづいている。");
	await s.say("kiriko", "吾輩、さっきも　ここを\n歩いたンゴ？");
	await s.note("yellow");
};

// ───────────────── ガイド: テト（3層＋rec_a 反応） ─────────────────

const tetoTalk = async (s: Story): Promise<void> => {
	// 初回: 椅子の話しかしない（この場所の説明はしない）
	if (!s.flag("seen_teto")) {
		s.set("seen_teto");
		await s.say("teto", "……先客よ。この椅子は\nゆずらないから");
		await s.say("kiriko", "ここ、会議室か\nなにかンゴ？");
		await s.say("teto", "待合室……だった気がする。\n……なんの、だったかしら");
		await s.say("kiriko", "椅子、一きゃくしか\nない……");
		await s.say("teto", "べ、別に　あんたのぶんを\n用意する筋合い　ないでしょ");
		return;
	}
	// 考察会話（note_yellow か note_exit8 のあと・1回だけ）: ポスター → 31年 → 椅子でオチ
	if (
		(s.flag("note_yellow") || s.flag("note_exit8")) &&
		!s.flag("seen_teto_kosatsu")
	) {
		s.set("seen_teto_kosatsu");
		await s.say("kiriko", "ここのポスター、だれが\nはってるンゴ？");
		await s.say("teto", "さあ。はりかえてるところは\n見たこと　ないけど");
		await s.say("teto", "……31年、見てないわね。\nここに来てから、だけど");
		await s.say("kiriko", "31ねん……");
		await s.say("teto", "べ、別に　長くないでしょ。\n椅子が　いいのよ、椅子が");
		return;
	}
	// レコードAを拾ったあと（1回だけ）
	if (s.has("rec_a") && !s.flag("seen_teto_rec")) {
		s.set("seen_teto_rec");
		await s.say("teto", "……それ、拾ったのね");
		await s.say("kiriko", "きくンゴ？");
		await s.say("teto", "……鳴らすなら、外で\n鳴らしてよね");
		await s.narrate("テトは、椅子ごと　すこし\n背を向けた。");
		return;
	}
	// 待機
	await s.say("teto", "……椅子、ゆずらないから");
};

// ───────────────── モブ・小物 ─────────────────

const genjuTalk = async (s: Story): Promise<void> => {
	if (!s.flag("seen_genju")) {
		s.set("seen_genju");
		await s.say(
			null,
			"（´・ω・｀）もともと　ここに\n住民なんて　いなかったんだよ",
			{
				name: "原住民",
			},
		);
		await s.say("kiriko", "……あなたは、住民ンゴ？");
		await s.say(null, "（´・ω・｀）", { name: "原住民" });
		return;
	}
	await s.say(
		null,
		"（´・ω・｀）カーペットが\nしめってて　おしりが冷たいんだよ",
		{
			name: "原住民",
		},
	);
};

const miniwaiTalk = async (s: Story): Promise<void> => {
	s.se("mokyu");
	await s.say(null, "もきゅ。", { name: "ミニワイ" });
	if (!s.flag("found_miniwai")) {
		s.set("found_miniwai");
		await s.narrate("ちいさいのが、こっちを見て\nはねている。");
		await s.say(null, "もきゅもきゅ。", { name: "ミニワイ" });
		await s.say("kiriko", "……よく見つけたな、って\n顔ンゴ");
		await s.note("miniwai");
		return;
	}
	await s.narrate("まるくなって、ねむそうだ。");
};

/** ポスター（おんJマンのバナー絵という設定。反復がこのマップの空間文法）。 */
const poster = (
	id: string,
	x: number,
	y: number,
	run: (s: Story) => Promise<void>,
) => ({ id, x, y, trigger: "talk" as const, run });

export const yellow: MapDef = {
	id: "yellow",
	scene: "yellow", // ジオラマ表示の場面（怪異の地区は箱がほどける）
	name: "黄色い部屋",
	bgm: "deep2",
	tint: "rgba(180,150,40,0.18)",
	ambient: { kind: "dust" },
	outside: "#141005",
	tiles,
	rows,
	events: [
		// ── 出口（入口のそばの扉 → hub） ──
		warp(
			"to_hub",
			3,
			1,
			{ map: "hub", x: 4, y: 2, dir: "down" },
			{ se: "door" },
		),

		// ── はじめて入ったとき（auto once。着地マス＝room の opening と同じ置き方） ──
		{
			id: "intro",
			x: 3,
			y: 2,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(400);
				await s.narrate("黄ばんだ　かべ紙。\nしめった　カーペット。");
				await s.narrate("蛍光灯の音が、上から\nずっと　降っている。");
				await s.say("kiriko", "……ホテルの　ろうか、\nみたいンゴ");
			},
		},

		// ── 蛍光灯の場面（深部のしきい×2。どちらの経路でも一度だけ） ──
		{
			id: "lights_s",
			x: 12,
			y: 13,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_y_lights,
			run: lightsScene,
		},
		{
			id: "lights_w",
			x: 14,
			y: 14,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_y_lights,
			run: lightsScene,
		},

		// ── ミャウミャウ目撃①（南のろうかの突き当たり） ──
		{
			id: "myau1",
			x: 22,
			y: 14,
			sprite: "char:myaumyau",
			dir: "left",
			trigger: "talk",
			fixedDir: true,
			when: (st) => !st.flags.seen_myau1,
			run: myauScene,
		},
		{
			id: "myau1_t0",
			x: 18,
			y: 14,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_myau1,
			run: myauScene,
		},
		{
			id: "myau1_t1",
			x: 19,
			y: 14,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_myau1,
			run: myauScene,
		},

		// ── ガイド: テト（唯一の事務椅子の先客） ──
		npc("teto_ev", 11, 10, "char:teto", tetoTalk, { dir: "down" }),

		// ── 原住民（壁ぎわの椅子） ──
		npc("genju", 1, 13, SPR.townsfolk, genjuTalk, { dir: "right" }),

		// ── ミニワイ（隠し部屋。歩行グラは仮＝同梱の子ども） ──
		npc("miniwai", 18, 3, "pub:sprites/mob_child.png", miniwaiTalk, {
			dir: "down",
		}),

		// ── レコードA「深夜のスレ」（最奥のじむ机の上） ──
		{
			id: "rec_a_ev",
			x: 23,
			y: 10,
			sprite: SPR.record,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.rec_a ?? 0),
			run: async (s) => {
				s.se("item");
				s.give("rec_a");
				s.set("got_rec_a");
				await s.narrate("机の上の　黒いレコードを\nひろった。");
				await s.record("rec_a");
				// 途切れた日常のあとに、日常の一言（dialogue-guide §3）
				await s.say("kiriko", "……おふろ、ながいンゴ");
			},
		},
		{
			id: "desk",
			x: 22,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				if (s.has("rec_a")) {
					await s.narrate("ほこりの上に、まるい跡が\nひとつ　のこっている。");
					return;
				}
				await s.narrate("じむ机。ひきだしは、\nぜんぶ　あかない。");
			},
		},

		// ── ポスターの反復（1枚だけ逆向き → note exit8） ──
		poster("poster1", 2, 1, async (s) => {
			await s.narrate("ポスターだ。おんJマンの\nバナー絵らしい。");
			await s.narrate(
				"見たことのある、いやな顔が\nよこを向いて　わらっている。",
			);
		}),
		poster("poster2", 8, 2, async (s) => {
			await s.narrate("さっきと　おなじポスター。\nおなじ顔。おなじ向き。");
		}),
		poster("poster3", 15, 2, async (s) => {
			await s.narrate("また　おなじポスターだ。");
			await s.say("kiriko", "……はってる人の顔が、\n見たいンゴ");
		}),
		poster("poster4", 7, 13, async (s) => {
			await s.narrate("おなじポスター。\n……何枚目かは、数えていない。");
		}),
		poster("poster_r", 13, 8, async (s) => {
			if (s.flag("note_exit8")) {
				await s.narrate("……まだ、こっちを\n向いている。");
				return;
			}
			await s.narrate("おなじポスター。……いや。");
			await s.narrate("この一枚だけ、\nこっちを　向いている。");
			await s.note("exit8");
		}),

		// ── はり紙（二度目から1文字違い。だれも言及しない） ──
		{
			id: "kanban",
			x: 6,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_y_kanban")) {
					s.set("seen_y_kanban");
					await s.narrate("はり紙だ。\n『出口は　こちら　→』");
					await s.narrate("……矢印の先は、\nただの　かべだ。");
					return;
				}
				await s.narrate("はり紙だ。\n『出ロは　こちら　→』");
				await s.narrate("……矢印の先は、\nただの　かべだ。");
			},
		},

		// ── うなる自販機 ──
		{
			id: "vending",
			x: 1,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				s.se("hum");
				if (!s.flag("seen_y_vending")) {
					s.set("seen_y_vending");
					await s.narrate("じはんきが、ひくく\nうなっている。");
					await s.narrate(
						"ボタンの飲みものの名前は、\nぜんぶ　かすれて　よめない。",
					);
					return;
				}
				await s.narrate("じはんきは、まだ\nうなっている。");
			},
		},

		// ── 消えたモニター（調べた回数のカウンタ。3回目に一度だけ映る） ──
		{
			id: "monitor",
			x: 19,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const n = Number(s.flag("seen_y_monitor") ?? 0);
				s.set("seen_y_monitor", n + 1);
				if (n === 2 && !s.flag("note_akaiheya")) {
					await s.narrate("消えたモニター。……いや。");
					await s.narrate("画面が、いちど　またたいた。");
					await s.say(null, "『――あなたは　すきですか？』");
					await s.narrate("……もう、なにも\nうつっていない。");
					await s.note("akaiheya");
					return;
				}
				await s.narrate("モニターは　消えている。\nなにも　うつっていない。");
			},
		},

		// ── 開かない扉（1ワールド1枚） ──
		{
			id: "door_e",
			x: 12,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ドアだ。ノブは　まわるのに、\nあかない。");
				await s.narrate("……どこにも　つながって\nいない気がする。");
			},
		},

		// ── 隠し①: かべのすきま → 3×3 の小部屋（ミニワイ） ──
		{
			id: "sukima",
			x: 16,
			y: 3,
			trigger: "touch",
			through: true,
			once: true,
			run: async (s) => {
				await s.narrate("……かべに、すきまが　あった。\nからだが　通る。");
			},
		},
		// ── 隠し②: 最奥からの近道（モニターのろうかへ抜ける） ──
		{
			id: "chikamichi",
			x: 20,
			y: 10,
			trigger: "touch",
			through: true,
			once: true,
			run: async (s) => {
				await s.narrate("ここのかべは、うすい。\n……通りぬけられる。");
				await s.say("kiriko", "ちかみち、おぼえたンゴ");
			},
		},

		// ── しらべられる小物・行き止まりの「見るもの」 ──
		{
			id: "switch",
			x: 4,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("電気のスイッチが　ある。");
				await s.narrate("……押しても、蛍光灯は\nついたまま。消えない。");
			},
		},
		{
			id: "wallpaper",
			x: 5,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("黄ばんだ　かべ紙。さわると、\nすこし　しめっている。");
				await s.note("yellow");
			},
		},
		{
			id: "wallpaper2",
			x: 0,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"かべ紙の　はしが、めくれて\nいる。……めくらないでおく。",
				);
			},
		},
		{
			id: "drip",
			x: 5,
			y: 9,
			trigger: "touch",
			through: true,
			once: true,
			run: async (s) => {
				await s.narrate("天じょうから、水が　一てき\n落ちてきた。");
				await s.say("kiriko", "……この上、なにが\nあるンゴ？");
			},
		},
		{
			id: "pocket",
			x: 9,
			y: 16,
			trigger: "touch",
			through: true,
			once: true,
			run: async (s) => {
				await s.narrate(
					"つきあたり。かべの向こうで、\nかすかに　水の音がする。",
				);
			},
		},
		{
			id: "crate_g",
			x: 1,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("だんボール箱を　あけてみた。\n……からっぽ。");
				await s.narrate("つぎの箱も、からっぽ。\nぜんぶ、からっぽだ。");
			},
		},
		{
			id: "crate_t",
			x: 14,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"だんボールの山。ぜんぶに\n『こわれもの』と　書いてある。",
				);
				await s.narrate("もちあげると、かるい。");
			},
		},
		{
			id: "crate_m",
			x: 19,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("だんボールの　巣だ。\n毛布が　しきつめてある。");
				await s.narrate("……手ざわりが、いい。");
			},
		},
		{
			id: "chair_f",
			x: 21,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("椅子が　たおれている。");
				await s.narrate("……ずっと前から、そのままだ。");
			},
		},
	],
};
