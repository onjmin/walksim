// 回線の間（無人駅の待合室・拠点）。DESIGN §4・§5 縦糸・content-briefs 品質ノルマ＋hub 小ネタ。
// 20×14。北壁に扉3つ（黄色い部屋・夕暮れの村・過去ログの地層）＝祭壇的シンメトリー
// （docs/style-spaces.md）。東に閉じた改札（回送表示）、西に開かないエレベーター、
// 南は黒の海にうかぶ売店と一本道の廊下。
// 座標は凍結（COORDINATE FREEZE）:
//   北扉 touch (4,1)→yellow(3,2) / (10,1)→village(3,2) / (16,1)→kakolog2(3,2)
//   世界からの戻り位置 (4,2)/(10,2)/(16,2)
//   南扉 touch (10,13)→street(27,10)（座標凍結v2: 旧 room 行きを差し替え）、street からの戻り位置 (10,12)
//   東改札 touch (18,7)→train(2,3)（gate_open のときだけ）
// 縦糸: ネムリン（改札の番人・ノート数で3段階）／響化アル（西のエレベーターを計測）／
// 革命シヨ（自販機。改札が開くと消えて小銭が残る）／ロゼ（レコード1・2・3枚でベンチに現れる）／
// つくよみちゃん（改札が開いた夜、お守りに鈴を結ぶ）。
// クリア後: ベンチに無題のレコード『　』（bgm "kowareta" は音響担当が bgm.ts に追加する）。

import { prepareCameoVoices } from "../../engine/audio";
import type { GameState, MapDef, Story, TileDef } from "../../engine/defs";
import { hasClearMark } from "../../engine/save";
import { settings } from "../../engine/settings";
import { npc, warp } from "../helpers";
import { notes } from "../notes";
import { SPR } from "../sprites";
import { base, basePx, INDOOR, PROPS } from "../tiles";

const TILE_FLOOR = base(3, 46); // タイルの床（INDOOR の ","）
const C_TILE = "#9a9a9a";
const C_WALL = "#e8e4dc";

// INDOOR に駅の備品を足す。
//   T 時刻表のわく（なにも貼られていない） / P はり紙（This Man） / k 柱時計
//   B b ベンチ / V 自販機 / f 鉄の柵（改札） / G 改札のさきのホーム床
//   D 北の扉 / E エレベーターの扉（ひらかない） / d 部屋へのドア（南端） / ^ その上半分（床）
//   o 見えない床（黒の海とおなじ色。かくし通路）
const tiles: Record<string, TileDef> = {
	...INDOOR,
	T: {
		layers: [base(1, 78), basePx(64, 1446)],
		color: C_WALL,
		passable: false,
	},
	P: {
		layers: [base(1, 78), PROPS.notice],
		color: C_WALL,
		passable: false,
	},
	B: {
		layers: [TILE_FLOOR, "sp:9UnaFUN"],
		color: C_TILE,
		passable: false,
	},
	b: {
		layers: [TILE_FLOOR, "sp:PcAZNWo"],
		color: C_TILE,
		passable: false,
	},
	V: {
		layers: [TILE_FLOOR, base(0, 519, 1, 2)],
		color: C_TILE,
		passable: false,
	},
	f: {
		layers: [TILE_FLOOR, base(5, 32)],
		color: C_TILE,
		passable: false,
	},
	G: { layers: [TILE_FLOOR], color: C_TILE, passable: true },
	D: {
		layers: [base(1, 78), base(7, 61, 1, 2)],
		color: C_WALL,
		passable: true,
	},
	E: {
		layers: [base(1, 78), base(0, 193, 1, 2)],
		color: C_WALL,
		passable: false,
	},
	// 南口の扉は上下2マスに分けて描く。16x32 のまま置くと、上半分が着地点 (10,12) で
	// キャラより手前に描かれ、立っているキリコが足ぶみのたびに点滅してしまう。
	d: {
		layers: [TILE_FLOOR, base(7, 78)],
		color: C_TILE,
		passable: true,
	},
	"^": {
		layers: [TILE_FLOOR, base(7, 77)],
		color: C_TILE,
		passable: true,
	},
	o: { layers: [], color: "#08070c", passable: true },
};

const rows = [
	"HHHHHHHHHHHHHHHHHHHH", // y0
	"hhThDhhkhhDhhPhhDhhh", // y1  時刻表 (2,1)・扉 (4,1)(10,1)(16,1)・時計 (7,1)・はり紙 (13,1)
	"#,,,,,,,,,,,,,,,,#  ", // y2  戻り位置 (4,2)(10,2)(16,2)
	"#,,,,,,,,,,,,,,,,#  ", // y3
	"E,,,,,,,,,,,,,,,,#  ", // y4  エレベーター (0,4)・アル (1,4)
	"#,,,,,Bb,,,,,Bb,,f  ", // y5  ベンチ西 (6,5)(7,5)・東 (13,5)(14,5)・柵 (17,5)
	"#,,,,,,,,,,,,,,,,f  ", // y6
	"#,,,,,,,,,,,,,,,,,G ", // y7  改札の通りぬけ (17,7)・ホーム (18,7)→train
	"#,,,,,,,,,,,,,,,,f  ", // y8  ネムリン (16,8)
	"  ###     ,         ", // y9  売店のおく（くらい）
	"  [=]V,   ,         ", // y10 売店 (2-4,10)・自販機 (5,10)・シヨ (6,10)
	"  ,,,,,,,,,,,,      ", // y11 南の通路。東の行き止まりに傘 (14,11)
	"          ^ooo,     ", // y12 street からの戻り位置 (10,12)。かくし通路 → 白い円 (14,12)
	"         #d#        ", // y13 まちのどおりへの南口 (10,13)
];

/** 駅のアナウンス（レイの機械音声。立ち絵なし・名前欄「アナウンス」）。 */
const announce = (s: Story, text: string) =>
	s.say("rei", text, { name: "アナウンス", noPortrait: true });

/** 持っているレコードの枚数（0〜3）。 */
const recCount = (st: GameState): number =>
	((st.items.rec_a ?? 0) > 0 ? 1 : 0) +
	((st.items.rec_b ?? 0) > 0 ? 1 : 0) +
	((st.items.rec_c ?? 0) > 0 ? 1 : 0);

/** ロゼのベンチの場面を何回見たか（seen_roze。0〜3）。 */
const rozeSeen = (st: GameState): number => {
	const v = Number(st.flags.seen_roze ?? 0);
	return Number.isFinite(v) ? v : 0;
};

/** かいいノートの発見数。 */
const noteCount = (st: GameState): number =>
	Object.keys(notes).filter((id) => !!st.flags[`note_${id}`]).length;

const NOTE_TOTAL = Object.keys(notes).length;

// ───────────────── ロゼ（ベンチの場面 ×3。DESIGN §5 縦糸） ─────────────────

const roze1 = async (s: Story): Promise<void> => {
	await s.wait(400);
	await s.narrate("ベンチに、しらない女の人が\nすわっている。");
	await s.say("kiriko", "……あの、ここの人ンゴ？");
	await s.say("roze", "ちがうアル");
	s.face("roze_ev", "right");
	await s.narrate("改札のほうを、じっと\n見ている。");
	await s.say("roze", "……まだ、鳴らないアル");
	s.hide("roze_ev");
	await s.narrate("つぎに　まばたきしたとき、\nもう　いなかった。");
	s.set("seen_roze", 1);
	// hide の印は消しておく（次の場面で when がまた出せるように。いまは when が偽なので出ない）
	s.show("roze_ev");
};

const roze2 = async (s: Story): Promise<void> => {
	s.show("roze_ev");
	await s.wait(400);
	await s.narrate("ベンチに、またあの人が\nすわっている。");
	await s.say("kiriko", "二まい目、ひろったンゴ");
	await s.say("roze", "……知ってるアル");
	await s.say("kiriko", "なんで　知ってるンゴ？");
	await s.say("roze", "…………");
	s.face("roze_ev", "right");
	await s.narrate("改札を　見たまま、\nこたえなかった。");
	await s.say("roze", "あと一枚アル");
	s.hide("roze_ev");
	await s.narrate("目を　はなした　すきに、\nいなくなっていた。");
	s.set("seen_roze", 2);
	s.show("roze_ev"); // hide の印だけ消す（when は偽）
};

const roze3 = async (s: Story): Promise<void> => {
	s.show("roze_ev");
	await s.wait(400);
	await s.narrate("ベンチのまえに、\n立っている。");
	await s.say("roze", "三枚アル");
	await s.say("roze", "……先に行って、\n待ってるアル");
	await s.say("kiriko", "先って、どこンゴ？");
	s.hide("roze_ev");
	await s.narrate("こたえの　かわりに、\nベンチだけが　のこった。");
	s.set("seen_roze", 3);
	s.show("roze_ev"); // hide の印だけ消す（when は偽）
};

// ───────────────── 改札が開く夜（auto once） ─────────────────

const gateOpen = async (s: Story): Promise<void> => {
	await s.wait(500);
	s.se("chapter");
	await announce(s, "――まもなく――");
	await s.wait(400);
	await announce(s, "まもなく、しゅうでんが\nまいります");
	await s.narrate("電光板の『回送』が、\n『きさらぎ』に　かわった。");
	s.set("gate_open");
	s.hide("shiyo"); // 自販機のまえから、いつのまにか消えている（小銭が残る）
	// カメオ音源の追加読み込み（DESIGN §5。ボイス OFF なら黙って何もしない。
	// 進み具合は engine/audio.ts が「せってい」のボイス欄に流す）
	if (settings.voice) {
		const ready = prepareCameoVoices();
		await s.narrate(
			"（回線の　おくで、いくつもの\n声が　めを　さましていく――）",
		);
		await ready.catch(() => {});
	}
	// つくよみちゃんが hub まで来る（once。お守りがあれば鈴を結ぶ）
	s.se("kane");
	s.set("seen_tsuku_hub");
	s.show("tsukuyomi_hub");
	s.place("tsukuyomi_hub", s.state.x, s.state.y + 1, "up");
	s.face("player", "down");
	await s.narrate("ふりかえると、巫女さんが\n立っていた。");
	if (s.has("omamori")) {
		await s.say("tsukuyomi", "お守り、もっていて\nくださったんですね");
		await s.narrate("お守りのひもに、小さな鈴を\nむすんでくれた。");
		s.se("suzu");
		s.set("got_suzu");
		await s.say(
			"tsukuyomi",
			"いってらっしゃいませ。\nいい夜に　なりますように",
		);
	} else {
		await s.say("tsukuyomi", "いってらっしゃいませ。\n……どうか、お気をつけて");
	}
	await s.fadeOut(400);
	s.hide("tsukuyomi_hub");
	await s.fadeIn(400);
	await s.narrate(
		s.flag("got_suzu")
			? "……鈴の音だけが、\nしばらく　のこっていた。"
			: "……もう、だれも\nいなかった。",
	);
};

// ───────────────── ネムリン（改札の番人。3層＋ノート数で3段階） ─────────────────

const nemurin = async (s: Story): Promise<void> => {
	if (s.flag("gate_open")) {
		if (!s.flag("seen_nemurin_gate")) {
			s.set("seen_nemurin_gate");
			await s.say("nemurin", "あいた……。\nうち、はじめて　見たピロ");
			await s.say("nemurin", "終電はね、むこうに\nついたら、もどらないって");
			await s.say("nemurin", "……いってらっしゃい\nむ〜ん");
			return;
		}
		await s.say("nemurin", "むこうでも、ちゃんと\nねるんだピロ……む〜ん");
		return;
	}
	if (!s.flag("seen_nemurin")) {
		s.set("seen_nemurin");
		await s.narrate("改札のわきで、女の子が\nこっくり　こっくりしている。");
		await s.say("nemurin", "……ふぁ。おきゃくさん\nピロ？　めずらしい");
		await s.say("kiriko", "ここ、どこンゴ？");
		await s.say("nemurin", "かいせんのま。……終電の、\n待合室みたいなとこ");
		await s.say("nemurin", "きっぷは　黒いレコード\n3まい……って、夢で見たピロ");
		await s.say("kiriko", "夢で見ただけンゴ？");
		await s.narrate("……すう、すう。\nもう　寝ている。");
		return;
	}
	// 考察ひとこと（技法4: 呼び名の発明。八尺様のノートのあと1回だけ）
	if (s.flag("note_hasshaku") && !s.flag("seen_nemurin_popo")) {
		s.set("seen_nemurin_popo");
		await s.say("nemurin", "そういえば……ぽぽぽの人、\n元気だったピロ？");
		await s.say("kiriko", "……ぽぽぽの人？");
		await s.say("nemurin", "白い、のっぽの……ふぁ。\n……眠たいむ〜ん……");
		await s.narrate("つづきは、寝息に\nなった。");
		return;
	}
	// 待機（ノートの発見数で3段階）
	const found = noteCount(s.state);
	if (found >= NOTE_TOTAL) {
		await s.say("nemurin", "……ぜんぶ　見つけたピロ？\nすごいすごい");
		await s.say("nemurin", "うちは　ぜんぶ、夢で\n見たむ〜ん。おそろい");
		return;
	}
	if (found >= 1) {
		await s.say("nemurin", "ノート、ふえてる？\n……いいなあピロ");
		await s.say("nemurin", "うちは　ここから\nうごけないむ〜ん");
		return;
	}
	await s.say("nemurin", "レコード、とびらのおく\nピロ……すぴぴ");
};

// ───────────────── 響化アル（西のエレベーター。3層） ─────────────────

const aru = async (s: Story): Promise<void> => {
	if (!s.flag("seen_aru")) {
		s.set("seen_aru");
		await s.narrate("エレベーターの前で、少年が\nメジャーを　あてている。");
		await s.say("aru", "……動かないで。\nいま、はかってる");
		await s.say("kiriko", "なにをンゴ？");
		await s.say("aru", "扉と、ゆかのすきま。\n0.3ミリ、ずれてる");
		await s.say("aru", "……昨日より");
		return;
	}
	// 考察会話（note_elevator のあと1回だけ）
	if (s.flag("note_elevator") && !s.flag("seen_aru_elev")) {
		s.set("seen_aru_elev");
		await s.say("aru", "よこのメモ、読んだ？");
		await s.say("kiriko", "4、2、6、2、10……ンゴ");
		await s.say("aru", "押す順番らしいよ。\nボタンの");
		await s.say("kiriko", "ボタン、ないンゴ");
		await s.say("aru", "うん。……ないね");
		await s.narrate("アルは、メジャーを\nまきなおした。");
		return;
	}
	// 改札が開いた夜だけ、計測の結果がちがう（結論は言わない）
	if (s.flag("gate_open")) {
		await s.say("aru", "……すきまが、閉じてる。\n今夜だけ");
		return;
	}
	await s.say("aru", "0.3……いや、0.4。\n……話しかけないで");
};

// ───────────────── 革命シヨ（自販機。改札が開くと消える） ─────────────────

const shiyo = async (s: Story): Promise<void> => {
	if (!s.flag("seen_shiyo")) {
		s.set("seen_shiyo");
		await s.narrate("自販機のまえで、女の子が\n小銭を　さがしている。");
		await s.narrate("……ちいさく、鼻歌が\n聞こえる。");
		await s.say("shiyo", "……あ？　なんだよ。\n息くせーぞジジイ");
		await s.say("kiriko", "ジ、ジジイじゃ\nないンゴ");
		await s.say("shiyo", "あたすの五十円が\nのまれた。それだけだ");
		await s.say("shiyo", "見てないで　行けよ。\n……出るまで　やる");
		return;
	}
	await s.narrate("……鼻歌が、ぴたりと\nやんだ。");
	await s.say("shiyo", "聞くな。\n……まだ　出ねー");
};

// ───────────────── クリア後: 無題のレコード『　』（進行に無関係） ─────────────────

const namelessRecord = async (s: Story): Promise<void> => {
	await s.narrate("ベンチに、レコードが\n一枚、おいてある。");
	await s.narrate("ラベルは――『　』。\nなにも、書かれていない。");
	s.bgm("kowareta");
	await s.wait(1600);
	await s.narrate("……しっている曲の、\n気がする。");
	await s.wait(900);
	await s.narrate("どこかが、すこしずつ\nずれていく。");
	await s.wait(900);
	await s.narrate("……さいごまで、きいた。");
	s.bgm("deep1");
	await s.narrate("レコードを、そっと\nベンチに　もどした。");
};

export const hub: MapDef = {
	id: "hub",
	scene: "hub", // ジオラマ表示の場面（怪異の地区は箱がほどける）
	name: "回線の間",
	bgm: "deep1",
	outside: "#08070c",
	tiles,
	rows,
	events: [
		// ── 自動イベント（並び順＝優先順。ロゼの場面 → 改札が開く夜） ──
		{
			id: "roze1",
			x: 2,
			y: 7,
			trigger: "auto",
			once: true,
			when: (st) =>
				!st.flags.gate_open && recCount(st) >= 1 && rozeSeen(st) < 1,
			run: roze1,
		},
		{
			id: "roze2",
			x: 3,
			y: 7,
			trigger: "auto",
			once: true,
			when: (st) =>
				!st.flags.gate_open && recCount(st) >= 2 && rozeSeen(st) < 2,
			run: roze2,
		},
		{
			id: "roze3",
			x: 4,
			y: 7,
			trigger: "auto",
			once: true,
			when: (st) =>
				!st.flags.gate_open && recCount(st) >= 3 && rozeSeen(st) < 3,
			run: roze3,
		},
		{
			id: "gate_open_ev",
			x: 5,
			y: 7,
			trigger: "auto",
			once: true,
			when: (st) => !st.flags.gate_open && recCount(st) >= 3,
			run: gateOpen,
		},

		// ── 出入り口（座標は凍結） ──
		warp(
			"to_yellow",
			4,
			1,
			{ map: "yellow", x: 3, y: 2, dir: "down" },
			{ se: "door" },
		),
		warp(
			"to_village",
			10,
			1,
			{ map: "village", x: 3, y: 2, dir: "down" },
			{ se: "door" },
		),
		warp(
			"to_kakolog",
			16,
			1,
			{ map: "kakolog2", x: 3, y: 2, dir: "down" },
			{ se: "door" },
		),
		// 南口は深夜のまちのどおり（駅の入口の階段）へ戻る（座標凍結v2）
		warp(
			"to_street",
			10,
			13,
			{ map: "street", x: 27, y: 10, dir: "left" },
			{ se: "door" },
		),

		// ── 改札（gate_open で train へ。閉まっている間は乗れない） ──
		{
			id: "gate",
			x: 18,
			y: 7,
			trigger: "touch",
			through: true,
			run: async (s) => {
				if (!s.flag("gate_open")) {
					s.se("cancel");
					await s.narrate("改札は　しまっている。\n電光板は『回送』のまま。");
					await announce(
						s,
						"――レコードを　おもちでない\n方は、ごじょうしゃできません",
					);
					await s.move("player", "l");
					return;
				}
				// 乗車のとき、遠くで鈴の音（つくよみの鈴。だれも言及しない）
				if (s.flag("got_suzu")) s.se("kane", { volume: 0.6, pan: -0.4 });
				await s.narrate("改札が　ひらいている。");
				await s.warp("train", 2, 3, "right", { se: "train" });
			},
		},

		// ── 人たち ──
		npc("nemurin", 16, 8, "char:nemurin", nemurin, { dir: "up" }),
		npc("aru", 1, 4, "char:aru", aru, { dir: "left" }),
		npc("shiyo", 6, 10, "char:shiyo", shiyo, {
			dir: "left",
			when: (st) => !st.flags.gate_open,
		}),
		// ロゼ（レコードを拾うたびベンチに現れる。場面は auto 側が進める）
		npc(
			"roze_ev",
			6,
			6,
			"char:roze",
			async (s) => {
				await s.say("roze", "…………");
			},
			{
				dir: "right",
				when: (st) => !st.flags.gate_open && recCount(st) > rozeSeen(st),
			},
		),
		// つくよみちゃん（改札が開いた夜だけ。場面は gate_open_ev の中）
		npc(
			"tsukuyomi_hub",
			10,
			3,
			"char:tsukuyomi",
			async (s) => {
				await s.say("tsukuyomi", "いい夜に\nなりますように");
			},
			{
				dir: "up",
				when: (st) => !!st.flags.seen_tsuku_hub,
			},
		),

		// ── シヨの小銭（改札が開いたあと、自販機のまえに落ちている） ──
		{
			id: "coin",
			x: 6,
			y: 10,
			trigger: "touch",
			through: true,
			once: true,
			when: (st) => !!st.flags.gate_open,
			run: async (s) => {
				await s.narrate("自販機のまえに、五十円玉が\nおちている。");
				s.se("item");
				await s.narrate("ひろった。……まだ、すこし\nあたたかい。");
				await s.say("kiriko", "……あとで、かえすンゴ");
				s.set("got_coin");
			},
		},

		// ── クリア後: 無題のレコード『　』（西のベンチの上） ──
		{
			id: "norec",
			x: 7,
			y: 5,
			sprite: SPR.record,
			trigger: "talk",
			fixedDir: true,
			when: () => hasClearMark(),
			run: namelessRecord,
		},

		// ── しらべられるもの（見えない talk イベント） ──
		{
			id: "timetable",
			x: 2,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("じこくひょうの　わく。");
				await s.narrate("――なにも、はられていない。");
				await s.narrate("わくの中だけ、ほこりが\nつもっていない。");
			},
		},
		{
			id: "clock",
			x: 7,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("駅の時計。――2:00。");
				await s.narrate("……音も、していない。");
			},
		},
		{
			id: "poster",
			x: 13,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべの　はり紙。");
				await s.narrate("『この顔を　夢で見たことが\nありますか？』");
				await s.narrate("顔の絵の部分だけ、\nやぶりとられている。");
				await s.say("kiriko", "……見たことある気が\nするンゴ");
				await s.note("thisman");
			},
		},
		{
			id: "elevator_memo",
			x: 0,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("手がきのメモが\nはってある。");
				await s.narrate("『4　2　6　2　10……』");
				await s.narrate("つづきは、にじんで\nよめない。");
				await s.note("elevator");
			},
		},
		{
			id: "board",
			x: 17,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("gate_open")) {
					await s.narrate("電光板。\n『――きさらぎ――』");
					return;
				}
				await s.narrate("電光板。『――回送――』");
				await s.narrate("ならんだ点が、ときどき\nちらついている。");
			},
		},
		{
			id: "vending",
			x: 5,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				s.se("hum");
				await s.narrate("じはんき。ひくく\nうなっている。");
				await s.narrate("ボタンは　ぜんぶ\n『うりきれ』。");
				await s.narrate("うなりには、長いのと\nみじかいのが　ある。");
			},
		},
		{
			id: "kiosk",
			x: 3,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("売店。シャッターが\nおりている。");
				await s.narrate("『準備中』のふだが、\nほこりを　かぶっている。");
			},
		},
		{
			id: "bench_w",
			x: 6,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("つめたいベンチ。\nすこしだけ、くぼんでいる。");
				if (rozeSeen(s.state) >= 1)
					await s.narrate("……だれかが、ここに\nすわっていた。");
			},
		},
		{
			id: "bench_e",
			x: 13,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("つめたいベンチ。");
				await s.narrate("……下で、なにかが\nうごいた気がする。");
			},
		},
		// ゲイザー？（ベンチの下の青いなにか。二度目で変わる）
		{
			id: "blob",
			x: 14,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_blob")) {
					s.set("seen_blob");
					await s.narrate("ベンチの下に、青い\nぷるぷるした　なにかがいる。");
					await s.say(null, "えぇ…");
					return;
				}
				await s.say(null, "……このハゲ");
				await s.say("kiriko", "ハ、ハゲて　ないンゴ！");
			},
		},
		// 南の行き止まりの傘（行き止まりにも見るものを置く）
		{
			id: "umbrella",
			x: 14,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("くらがりに、ビニール傘が\n一本、たてかけてある。");
				await s.say("kiriko", "……もちぬしは、\n帰れたンゴかな");
			},
		},
		// かくし通路のさき（見えない床の先の白い円。docs/style-spaces.md §3）
		{
			id: "circle",
			x: 14,
			y: 12,
			sprite: PROPS.magicCircle,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("ゆかに、白い円が\nかいてある。");
				await s.narrate("円のなかは、そとより\nすこしだけ　あたたかい。");
				if (!s.flag("found_circle")) {
					s.set("found_circle");
					await s.say("kiriko", "……よく見つけたンゴ、\n吾輩");
				}
			},
		},
	],
};
