// 夕暮れの村（八尺様の村）。docs/content-briefs.md「world: village + kura」・DESIGN §4。
// 26×20。tint 夕焼け・BGM sad・弱い dust。深夜2時のはずなのに、村はずっと夕暮れのまま。
// 村境の地蔵×4（北の一体だけ倒れている）・神社のつくよみちゃん（しきたり＋お守り）・
// 八尺様の遠景（when フラグで位置が変わる。接近帯は popo のパン＋暗転＋一歩押し戻し）・
// 呼び声（蔵への道・お守り必須帯の手前）・くねくね（田の向こう・二度目は消えている）・
// 杉沢村の看板（入口）・巨頭オの傾いた看板（蔵への道）。
//
// 経路: 北西の扉(3,1)⇔hub。参道=x3 の道。メインストリート=y10（西端・東端に地蔵）。
// 南の道=x10（用水路の橋→南の地蔵）。蔵への道=x17 を北へ→(17,6)お守りの帯→y5 を東へ→蔵の戸(20,4)。
// 隠し: 入口の道の東、木立の切れ目 (4,4) から北の小さなほこら (5,3)。

import type { EventDef, MapDef, Story, TileDef } from "../../engine/defs";
import type { Dir } from "../../engine/types";
import { OBJ, warp } from "../helpers";
import { base, basePx, FIELD, field, PROPS, TOWN } from "../tiles";

// ── タイル ──
// FIELD をベースに、家（TOWN）と村の小物を足す。
//   :  あぜ道   . , 草地   i  田（通れない・counter=1マスむこうを調べられる）
//   ~  用水路   #  橋      T  木   L  電柱（街灯で代用）   G  石灯籠   U  井戸
//   n ^ 赤い屋根（神社・母屋）   z Z わら屋根   ( ) 白壁   [ ] 板壁
//   w  窓（壁の上段）   W  窓（白壁の下段）   m  窓（板壁の下段）
//   q  しまった戸（通れない）   d  蔵の戸（通れる。warp を置く）
const GRASS = field(1, 10);
const WIN = basePx(48, 1382); // 木枠の窓
const tiles: Record<string, TileDef> = {
	...FIELD,
	i: {
		layers: [GRASS, base(0, 11)],
		color: "#7a9a3a",
		passable: false,
		counter: true,
	},
	L: { layers: [GRASS, "sp:2gTYec"], color: "#6fae3a", passable: false },
	G: { layers: [GRASS, PROPS.stoneLantern], color: "#6fae3a", passable: false },
	U: { layers: [GRASS, PROPS.well], color: "#6fae3a", passable: false },
	n: TOWN.n,
	"^": TOWN["^"],
	z: TOWN.z,
	Z: TOWN.Z,
	"(": TOWN["("],
	")": TOWN[")"],
	"[": TOWN["["],
	"]": TOWN["]"],
	w: TOWN.w,
	W: { layers: [base(1, 60), WIN], color: "#e8e8e8", passable: false },
	m: { layers: [base(1, 56), WIN], color: "#6a4a2a", passable: false },
	q: {
		layers: [base(1, 60), base(7, 77, 1, 2)],
		color: "#e8e8e8",
		passable: false,
	},
	d: TOWN.d,
};

const rows = [
	"                          ", // y0
	"   :               zzz    ", // y1  hubへの出口 (3,1)
	"  T:.T             ZZZ    ", // y2  着地 (3,2)・杉沢村の看板 (4,2)
	"   :T.      .....  (w(    ", // y3  ほこら (5,3)・八尺様② (14,3)
	"   :..      ..L... )d)    ", // y4  電柱のかげ (14,4)・倒れた地蔵 (17,4)・蔵の戸 (20,4)
	"   :   nnn  .....::::.    ", // y5  蔵の道の曲がり角。蔵の前 (20,5)
	"   :   ^^^ nnnnn :        ", // y6  お守りの帯 (17,6)
	"   :...(w(.^^^^^.:iiiiiii ", // y7  呼び声 (17,7)・八尺様① (23,7)
	"   :...)q).(w(w(.:iiiiiii ", // y8  絵馬かけ (6,8)
	"   :..G...G)W)q).:iLiiLii ", // y9  さいせん箱 (8,9)・つくよみちゃん (9,9)
	" :::::::::::::::::::::::::", // y10 メインストリート。西の地蔵 (1,10)・東の地蔵 (24,10)
	" ,.,.zzz.,:L.,..,.ii:iiii ", // y11 バス停 (2,11)・電柱のはり紙 (11,11)
	" .,..ZZZ,.:..U.,T.ii:iiii ", // y12 井戸 (13,12)・かきの木 (16,12)
	" iii.[[[..:,..,..,iiiiiii ", // y13
	" iii.]m].,:.,...,.iiiiiii ", // y14 くねくね (20,14)
	" ,..,...,.:,..,..,.,..,.. ", // y15
	"  ~~~~~~~~#~~~~~~~~~~~~~  ", // y16 用水路と橋 (10,16)
	"       .. :               ", // y17 八尺様③ (8,17)
	"          .               ", // y18 南の地蔵 (10,18)
	"                          ", // y19
];

// ── 小さな道具 ──
const BACK: Record<Dir, "u" | "d" | "l" | "r"> = {
	up: "d",
	down: "u",
	left: "r",
	right: "l",
};

/** 八尺様の接近帯。ぽ……ぽ……（パンで方向）＋わずかな暗転＋一歩押し戻し。死なない。 */
const popoPush = async (s: Story, pan: number): Promise<void> => {
	s.se("popo", { pan, volume: 0.8 });
	await s.wait(300);
	s.se("popo", { pan: pan * 0.6, volume: 0.9 });
	await s.flash("#000", 240);
	if (!s.flag("seen_popo_push")) {
		s.set("seen_popo_push");
		await s.narrate("……ぽ、　ぽ、と　きこえる。\nあしが、まえに　でない。");
	}
	await s.move("player", BACK[s.state.dir] ?? "d");
};

/** 八尺様をはじめて見た場面（東の田／電柱のかげ、どちらか先に踏んだ方）。 */
const firstSight = async (s: Story): Promise<void> => {
	s.set("seen_hasshaku");
	const near = !!s.flag("rule_hasshaku"); // お守りのあと＝電柱のかげ（北西）
	const pan = near ? -0.6 : 0.7;
	await s.wait(250);
	s.se("popo", { pan, volume: 0.35 });
	await s.wait(500);
	s.se("popo", { pan, volume: 0.3 });
	await s.narrate("……ぽ、　ぽ、と\nとおくで　きこえる。");
	await s.narrate(
		near
			? "電柱のかげに、白い\nせの高い人が　立っている。"
			: "田んぼの　むこうに、白い\nせの高い人が　立っている。",
	);
	await s.say("kiriko", "……このきょりでも、\nたかいって　わかるンゴ");
	await s.note("hasshaku");
};

/** 見えない接近帯イベント（通れる床の上に置く）。 */
const belt = (
	id: string,
	x: number,
	y: number,
	pan: number,
	when: EventDef["when"],
): EventDef => ({
	id,
	x,
	y,
	trigger: "touch",
	through: true,
	when,
	run: async (s) => {
		await popoPush(s, pan);
	},
});

// ── つくよみちゃん（3層: しきたり／考察／待機） ──
const tsukuyomiTalk = async (s: Story): Promise<void> => {
	// (1) 初回: しきたり＋お守り＋鈴。理由は言わない（dialogue-guide §4-2）
	if (!s.flag("rule_hasshaku")) {
		await s.say("tsukuyomi", "こんばんは。……ひとつだけ、\nよろしいですか");
		await s.say("tsukuyomi", "白い服の、せの高い方――");
		await s.say(
			"tsukuyomi",
			"目を　合わせない。よばれても\nこたえない。まっすぐ　歩く",
		);
		await s.say("kiriko", "……なんで、ンゴ？");
		await s.say("tsukuyomi", "この村では、そう　することに\nなっているんです");
		await s.narrate("つくよみちゃんは、ちいさな\nお守りを　さしだした。");
		s.se("item");
		s.give("omamori");
		s.set("got_omamori");
		await s.narrate("『つくよみのお守り』を\nうけとった。");
		await s.narrate(
			"つくよみちゃんは　本殿にむかい、\n鈴を　ひとつ　鳴らした。",
		);
		s.se("kane");
		await s.say("tsukuyomi", "わたしは、祈っておきますね");
		s.set("rule_hasshaku");
		return;
	}
	// (2) 考察会話（note_hasshaku＋note_jizo のあと・1回だけ）。断定しない・祈りで閉じる
	if (
		s.flag("note_hasshaku") &&
		s.flag("note_jizo") &&
		!s.flag("seen_tsuku_kosatsu")
	) {
		s.set("seen_tsuku_kosatsu");
		await s.say("kiriko", "北の地蔵、たおれてたンゴ");
		await s.say(
			"tsukuyomi",
			"ええ。なんど　直しても、\n朝には　たおれているそうです",
		);
		await s.say("kiriko", "……だれが？");
		await s.say(
			"tsukuyomi",
			"さあ。……でも、お花は\nいつも　あたらしいんですよ",
		);
		await s.say("tsukuyomi", "わたしは、祈っておきますね");
		return;
	}
	// (3) お守りの効きめの話（ボケとまじめな返し・1回だけ）
	if (!s.flag("seen_tsuku_joke")) {
		s.set("seen_tsuku_joke");
		await s.say("kiriko", "このお守り、どのくらい\nとおくまで　きくンゴ？");
		await s.say("tsukuyomi", "……はかった方は、\nいらっしゃらないですね");
		await s.say("kiriko", "吾輩が　一号ンゴか");
		await s.say("tsukuyomi", "ふふ。……むちゃは、\nなさらないでくださいね");
		return;
	}
	// 呼び声にこたえてしまった人へ（1回だけ）
	if (s.flag("seen_yobigoe_reply") && !s.flag("seen_tsuku_yobigoe")) {
		s.set("seen_tsuku_yobigoe");
		await s.say("tsukuyomi", "……こえは、ときどき\nうそを　つきます");
		await s.say("tsukuyomi", "ほんものの　こえは、\nいそがせたりしませんよ");
		return;
	}
	// 蔵から戻ったあと（1回だけ）
	if (s.flag("got_rec_b") && !s.flag("seen_tsuku_kura")) {
		s.set("seen_tsuku_kura");
		await s.say("tsukuyomi", "くらの戸は、しめて\nきてくださいましたか");
		await s.say("kiriko", "……し、しめたンゴ");
		await s.say("tsukuyomi", "ふふ。なら、いいんです");
		return;
	}
	// 待機
	await s.say("tsukuyomi", "日が　しずみきる前に、\n帰ってくださいね");
};

// ── 呼び声（蔵への道・お守りの帯の手前。auto ではなく踏み帯で一度だけ） ──
const yobigoe = async (s: Story): Promise<void> => {
	s.set("seen_yobigoe");
	await s.wait(300);
	await s.narrate("うしろで、声がした。");
	await s.say(null, "――こっちへ、\nおいで", { name: "おかあさんの声" });
	await s.narrate("しっている声だ。\n……よく、しっている声だ。");
	const i = await s.choose(["＞＞1　返事をする", "＞＞2　だまって歩く"]);
	if (i === 0) {
		s.set("seen_yobigoe_reply");
		await s.say("kiriko", "……おかあさん？");
		await s.narrate("――へんじを、してしまった。");
		await s.warp("village", 7, 9, "down");
		await s.narrate("……神社の　まえに\n立っていた。");
		await s.say("tsukuyomi", "……もどってきましたね");
		await s.narrate("日は、まだ　しずまない。");
		await s.note("yobigoe");
		return;
	}
	await s.narrate("へんじを　しなかった。\n足だけ、まえに　うごかした。");
	await s.wait(500);
	await s.narrate("こえは、それきり\nついてこなかった。");
	await s.note("yobigoe");
};

export const village: MapDef = {
	id: "village",
	name: "夕暮れの村",
	bgm: "sad",
	tint: "rgba(150,60,50,0.25)",
	ambient: { kind: "dust", color: "#c8a070" },
	outside: "#1a0d0a",
	tiles,
	rows,
	events: [
		// ── 出入り口 ──
		warp(
			"to_hub",
			3,
			1,
			{ map: "hub", x: 10, y: 2, dir: "down" },
			{ se: "door" },
		),
		warp(
			"to_kura",
			20,
			4,
			{ map: "kura", x: 4, y: 6, dir: "up" },
			{ se: "door" },
		),

		// ── はじめて来たとき（auto once）。深夜なのに夕暮れ ──
		{
			id: "arrive",
			x: 3,
			y: 2,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(400);
				await s.narrate("ゆうやけ。\n……夜中の　はずンゴ。");
				await s.narrate("たんぼの　においがする。");
			},
		},

		// ── 村の入口: 杉沢村の看板 ──
		{
			id: "sugisawa",
			x: 4,
			y: 2,
			sprite: OBJ.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("くちた看板だ。");
				await s.narrate(
					"『ここから先へ　入った者は――』\n（あとは　よめない。）",
				);
				await s.note("sugisawa");
			},
		},

		// ── 村境の地蔵×4。北の一体だけ倒れている ──
		{
			id: "jizo_n",
			x: 17,
			y: 4,
			sprite: base(1, 13),
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("たおれた地蔵だ。\nだれかが　直そうとした跡がある。");
				await s.narrate("あたらしい花が、\nそばに　そなえてある。");
				await s.note("jizo");
			},
		},
		{
			id: "jizo_w",
			x: 1,
			y: 10,
			sprite: PROPS.grave,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("西の　地蔵。\nよだれかけが、あたらしい。");
				await s.say("kiriko", "……だれが、かえてるンゴ？");
			},
		},
		{
			id: "jizo_e",
			x: 24,
			y: 10,
			sprite: PROPS.grave,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("東の　地蔵。\n手のひらに、あめ玉がひとつ。");
			},
		},
		{
			id: "jizo_s",
			x: 10,
			y: 18,
			sprite: PROPS.grave,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("南の　地蔵。\n水の音を、きいている。");
			},
		},

		// ── 神社: つくよみちゃん・さいせん箱・絵馬かけ・（裏に）ほこら ──
		{
			id: "tsukuyomi_ev",
			x: 9,
			y: 9,
			sprite: "char:tsukuyomi",
			dir: "down",
			trigger: "talk",
			run: tsukuyomiTalk,
		},
		{
			id: "saisen",
			x: 8,
			y: 9,
			sprite: PROPS.crate,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("さいせん箱。\n五円玉が、一枚だけ。");
				await s.say("kiriko", "……ごえん、ンゴ");
			},
		},
		{
			id: "ema",
			x: 6,
			y: 8,
			sprite: PROPS.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate(
					"絵馬かけ。ふるい絵馬に\nまじって、あたらしいのが一枚。",
				);
				await s.narrate("『はやく　なおりますように』");
			},
		},
		{
			id: "hokora",
			x: 5,
			y: 3,
			sprite: PROPS.stoneLantern,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("木立のおくに、ちいさな\nほこら。");
				s.se("suzu", { volume: 0.4 });
				await s.narrate("あめ玉が　ひとつ、\nそなえてある。……あたらしい。");
				s.set("found_hokora");
			},
		},

		// ── 蔵への道: 巨頭オの看板 ──
		{
			id: "kyotoo",
			x: 16,
			y: 7,
			sprite: OBJ.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("かたむいた看板だ。");
				await s.narrate("……『巨頭オ』。");
				await s.note("kyotoo");
			},
		},

		// ── 八尺様（遠景。when フラグで位置が変わる。話しかけられる距離には来ない） ──
		{
			id: "hass1",
			x: 23,
			y: 7,
			sprite: "char:hasshaku",
			dir: "down",
			trigger: "talk",
			fixedDir: true,
			when: (st) => !st.flags.rule_hasshaku,
			run: async (s) => {
				await s.say("hasshaku", "ぽ　ぽ　ぽ");
			},
		},
		{
			id: "hass2",
			x: 14,
			y: 3,
			sprite: "char:hasshaku",
			dir: "down",
			trigger: "talk",
			fixedDir: true,
			when: (st) => !!st.flags.rule_hasshaku && !st.flags.got_rec_b,
			run: async (s) => {
				await s.say("hasshaku", "ぽ　ぽ　ぽ");
			},
		},
		{
			id: "hass3",
			x: 8,
			y: 17,
			sprite: "char:hasshaku",
			dir: "up",
			trigger: "talk",
			fixedDir: true,
			when: (st) => !!st.flags.got_rec_b,
			run: async (s) => {
				await s.say("hasshaku", "ぽ　ぽ　ぽ");
			},
		},
		// 電柱のかげ、いなくなったあとの跡（八尺様②の場所）
		{
			id: "hass_trace",
			x: 14,
			y: 3,
			trigger: "talk",
			when: (st) => !!st.flags.got_rec_b,
			run: async (s) => {
				await s.narrate("草が、ひとのかたちに\nたおれている。……せの高い。");
			},
		},

		// ── はじめての目撃（東の街道／蔵への道、先に踏んだ方で一度だけ） ──
		{
			id: "sight_e0",
			x: 20,
			y: 10,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_hasshaku && !st.flags.rule_hasshaku,
			run: firstSight,
		},
		{
			id: "sight_e1",
			x: 21,
			y: 10,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_hasshaku && !st.flags.rule_hasshaku,
			run: firstSight,
		},
		{
			id: "sight_e2",
			x: 22,
			y: 10,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_hasshaku && !st.flags.rule_hasshaku,
			run: firstSight,
		},
		{
			id: "sight_n",
			x: 17,
			y: 9,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_hasshaku,
			run: firstSight,
		},

		// ── 蔵への道のゲート（お守りが無いと通れない。popo の帯） ──
		{
			id: "gate_popo",
			x: 17,
			y: 6,
			trigger: "touch",
			through: true,
			when: (st) => !(st.items.omamori ?? 0),
			run: async (s) => {
				s.se("popo", { pan: -0.6, volume: 0.6 });
				await s.wait(320);
				s.se("popo", { pan: 0.4, volume: 0.8 });
				await s.flash("#000", 240);
				if (!s.flag("seen_gate_popo")) {
					s.set("seen_gate_popo");
					await s.narrate("くらへの　みち。\n……ぽ、　ぽ、と　きこえる。");
					await s.move("player", "d");
					await s.say("kiriko", "……すなおに　もどるンゴ");
					return;
				}
				await s.move("player", "d");
			},
		},
		// お守りを持ってはじめて帯を越えるとき、鈴がひとつ鳴る
		{
			id: "gate_pass",
			x: 17,
			y: 6,
			trigger: "touch",
			through: true,
			when: (st) => (st.items.omamori ?? 0) > 0 && !st.flags.seen_suzu_pass,
			run: async (s) => {
				s.set("seen_suzu_pass");
				s.se("suzu", { volume: 0.6 });
				await s.narrate("たもとで、すずが\nちいさく　鳴った。");
			},
		},

		// ── 呼び声（お守りの帯の手前・一度だけ） ──
		{
			id: "yobigoe_ev",
			x: 17,
			y: 7,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_yobigoe,
			run: yobigoe,
		},

		// ── 八尺様②の接近帯（電柱のかげ。お守りがあっても、それ以上は近づけない） ──
		belt(
			"h2_belt0",
			12,
			4,
			0.5,
			(st) => !!st.flags.rule_hasshaku && !st.flags.got_rec_b,
		),
		belt(
			"h2_belt1",
			13,
			4,
			0.25,
			(st) => !!st.flags.rule_hasshaku && !st.flags.got_rec_b,
		),
		belt(
			"h2_belt2",
			15,
			4,
			-0.25,
			(st) => !!st.flags.rule_hasshaku && !st.flags.got_rec_b,
		),
		belt(
			"h2_belt3",
			16,
			4,
			-0.5,
			(st) => !!st.flags.rule_hasshaku && !st.flags.got_rec_b,
		),

		// ── 帰り道: 入口の近くで、遠くに一度だけ popo（もう近づいてこない） ──
		{
			id: "kaeri0",
			x: 3,
			y: 3,
			trigger: "touch",
			through: true,
			when: (st) => (st.items.omamori ?? 0) > 0 && !st.flags.seen_kaeri_popo,
			run: async (s) => {
				if (s.state.dir !== "up") return;
				s.set("seen_kaeri_popo");
				s.se("popo", { pan: -0.85, volume: 0.35 });
				await s.narrate("とおくで、ぽ、と　ひとつ。\n……それきり、しずかだ。");
			},
		},
		{
			id: "kaeri1",
			x: 3,
			y: 4,
			trigger: "touch",
			through: true,
			when: (st) => (st.items.omamori ?? 0) > 0 && !st.flags.seen_kaeri_popo,
			run: async (s) => {
				if (s.state.dir !== "up") return;
				s.set("seen_kaeri_popo");
				s.se("popo", { pan: -0.85, volume: 0.35 });
				await s.narrate("とおくで、ぽ、と　ひとつ。\n……それきり、しずかだ。");
			},
		},

		// ── くねくね（南東の田の、いちばん奥。二度目に来ると消えている） ──
		{
			id: "kunekune",
			x: 20,
			y: 14,
			sprite: basePx(96, 1760, 6, 16),
			trigger: "talk",
			fixedDir: true,
			when: (st) => !st.flags.seen_kunekune,
			run: async (s) => {
				if (!s.flag("seen_kunekune_look")) {
					s.set("seen_kunekune_look");
					await s.narrate(
						"白い、ほそいものが　ゆれている。\n……わかっては　いけない気がする。",
					);
					await s.note("kunekune");
					return;
				}
				await s.narrate("まだ、ゆれている。\n……見るのは、やめとくンゴ。");
			},
		},
		{
			id: "kunekune_gone",
			x: 20,
			y: 14,
			trigger: "talk",
			when: (st) => !!st.flags.seen_kunekune,
			run: async (s) => {
				await s.narrate("……もう、いない。");
				await s.narrate("いねだけが、ゆれている。");
			},
		},
		// あぜ道を離れたら、次に来たときには消えている（見ている前では消えない）
		{
			id: "kune_off",
			x: 20,
			y: 11,
			trigger: "touch",
			through: true,
			when: (st) => !!st.flags.seen_kunekune_look && !st.flags.seen_kunekune,
			run: async (s) => {
				s.set("seen_kunekune");
			},
		},

		// ── 生活の跡（しらべられるもの） ──
		{
			id: "rice",
			x: 19,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("いねが、いっせいに\nおなじほうへ　ゆれた。");
				await s.narrate("風は、ない。");
			},
		},
		{
			id: "well",
			x: 13,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("井戸。ふたが　してある。\n……石が、のせてある。");
			},
		},
		{
			id: "kaki",
			x: 16,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かきの木。\n実は、たかい所に　ひとつだけ。");
			},
		},
		{
			id: "busstop",
			x: 2,
			y: 11,
			sprite: PROPS.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("バスていの　しるべ。\n『すぎさわ』");
				await s.narrate("時刻表は、ぜんぶ\n白く　やけている。");
			},
		},
		{
			id: "flyer",
			x: 11,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("電柱の　はり紙。\n『さがしています』");
				await s.narrate("しゃしんの場所が、白く\nやけて　消えている。");
			},
		},
		{
			id: "door_b",
			x: 14,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("たてつけのいい戸。\n……夕はんの、においがする。");
				await s.narrate("ノックは、しないでおいた。");
			},
		},
		{
			id: "win_b",
			x: 12,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("レースのカーテンごしに、\nあかりが　ついている。");
				await s.narrate("かげは、うごかない。");
			},
		},
		{
			id: "win_d",
			x: 6,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("テレビの　ひかりが\nちらちら　している。");
				await s.narrate("音は、きこえない。");
			},
		},
		{
			id: "suiro",
			x: 9,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("用水路。ゆうやけの色が\nながれて、とぎれない。");
			},
		},
		// 橋の上: 蔵のあと、川むこうに白いもの（一度だけ）
		{
			id: "minami",
			x: 10,
			y: 16,
			trigger: "touch",
			through: true,
			when: (st) => !!st.flags.got_rec_b && !st.flags.seen_hass3,
			run: async (s) => {
				s.set("seen_hass3");
				s.se("popo", { pan: -0.9, volume: 0.25 });
				await s.narrate("川むこうの　くろい野に、\n白いものが　立っている。");
				await s.narrate("……こっちには、来ない。");
			},
		},
	],
};
