// 回線の間（無人駅の待合室）。板の 名残（オムニバス）の 入口の 待合室（STORY.md §5.97）。
// 20×14。東に改札（終電は いつでも 来る → きさらぎ駅の 名残）、西に開かないエレベーター、
// 南は黒の海にうかぶ売店と一本道の廊下。廊下の西はしの階段は、さらに下（過去ログの地層の 名残）へ。
// 黄色い部屋は こくどうのファミレスの通用口、夕暮れの村は やまみちの峠から、それぞれ歩いてつながる。
// 座標は凍結（COORDINATE FREEZE）:
//   下り階段 touch (2,11)→kakolog2(3,2)、kakolog2 からの戻り位置 (3,11)
//   南扉 touch (10,13)→street(27,10)、street からの戻り位置 (10,12)
//   東改札 touch (18,7)→train(2,3)
// 人：ネムリン（改札の番人・ノート数で3段階）。2作目の 村の 仲間（ロゼ・フェリス・シヨ・ゼロ）と 住人（アル・リノ）は 3作目には 出ない。
// クリア後: ベンチに無題のレコード『　』（bgm "kowareta"）。

import type { GameState, MapDef, Story, TileDef } from "../../engine/defs";
import { hasClearMark } from "../../engine/save";
import { npc, warp } from "../helpers";
import { notes } from "../notes";
import { SPR } from "../sprites";
import { HUB, STN } from "../tiles-station";

// 駅の待合室のチップ（data/tiles-station.ts の HUB。文字の意味は旧版のまま）。
//   T 時刻表のわく（なにも貼られていない） / P はり紙（This Man） / k 駅の時計
//   B b ベンチ / V 自販機 / f 自動改札機（改札の柵） / G 改札のさきのホーム床
//   S 下り階段（過去ログの地層へ） / E エレベーターの扉（ひらかない） / d 部屋へのドア（南端） / ^ その上半分（床）
//   o 見えない床（黒の海とおなじ色。かくし通路）
const tiles: Record<string, TileDef> = {
	...HUB,
	S: { layers: [STN.steps], color: "#5a5650", passable: true },
};

const rows = [
	"HHHHHHHHHHHHHHHHHHHH", // y0
	"hhThhhhkhhhhhPhhhhhh", // y1  時刻表 (2,1)・時計 (7,1)・はり紙 (13,1)
	"#,,,,,,,,,,,,,,,,#  ", // y2
	"#,,,,,,,,,,,,,,,,#  ", // y3
	"E,,,,,,,,,,,,,,,,#  ", // y4  エレベーター (0,4)・アル (1,4)
	"#,,,,,Bb,,,,,Bb,,f  ", // y5  ベンチ西 (6,5)(7,5)・東 (13,5)(14,5)・柵 (17,5)
	"#,,,,,,,,,,,,,,,,f  ", // y6
	"#,,,,,,,,,,,,,,,,,G ", // y7  改札の通りぬけ (17,7)・ホーム (18,7)→train
	"#,,,,,,,,,,,,,,,,f  ", // y8  ネムリン (16,8)
	"  ###     ,         ", // y9  売店のおく（くらい）
	"  [=]V,   ,         ", // y10 売店 (2-4,10)・自販機 (5,10)・シヨ (6,10)
	"  S,,,,,,,,,,,      ", // y11 南の通路。西はしの下り階段 (2,11)→kakolog2・東の行き止まりに傘 (14,11)
	"          ^ooo,     ", // y12 street からの戻り位置 (10,12)。かくし通路 → 白い円 (14,12)
	"         #d#        ", // y13 まちのどおりへの南口 (10,13)
];

/** 駅のアナウンス（レイの機械音声。立ち絵なし・名前欄「アナウンス」）。 */
const announce = (s: Story, text: string) =>
	s.say("rei", text, { name: "アナウンス", noPortrait: true });

/** かいいノートの発見数。 */
const noteCount = (st: GameState): number =>
	Object.keys(notes).filter((id) => !!st.flags[`note_${id}`]).length;

const NOTE_TOTAL = Object.keys(notes).length;

// ───────────────── 改札（終電は いつでも 来る。はじめての 夜だけ アナウンス） ─────────────────

const firstTrain = async (s: Story): Promise<void> => {
	s.set("seen_hub_train");
	s.se("chapter");
	await announce(s, "――まもなく――");
	await s.wait(400);
	await announce(s, "まもなく、しゅうでんが\nまいります");
	await s.narrate("……どこかで　聞いた　声の\nアナウンスだった。");
	await s.narrate("電光板の『回送』が、\n『きさらぎ』に　かわった。");
};

// ───────────────── ネムリン（改札の番人。3層＋ノート数で3段階） ─────────────────

const nemurin = async (s: Story): Promise<void> => {
	if (s.flag("seen_hub_train")) {
		if (!s.flag("seen_nemurin_gate")) {
			s.set("seen_nemurin_gate");
			await s.say("nemurin", "終電、来たピロ。\n……今夜も　来たピロ");
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
		await s.say("nemurin", "ここから　いろんな　とこに\nつながってる……って、夢で見たピロ");
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
		await s.say("nemurin", "……おもての　バス停にも、\nレコード　あったピロ……む〜ん");
		return;
	}
	// 板の 名残の ありか（地続きの 4か所: こくどうのファミレスの おく・やまみちの峠のむこう・この駅の下・終電のさき）
	await s.say("nemurin", "レコード……灯りのきえた\n店のおくと、山のむこう");
	await s.say("nemurin", "ここの　したと、終電の　さき。\nおもての　バス停……すぴぴ");
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
	s.bgm("hub");
	await s.narrate("レコードを、そっと\nベンチに　もどした。");
};

export const hub: MapDef = {
	id: "hub",
	scene: "hub", // ジオラマ表示の場面（怪異の地区は箱がほどける）
	name: "回線の間",
	bgm: "hub",
	outside: "#08070c",
	tiles,
	rows,
	events: [
		// ── 出入り口（座標は凍結） ──
		// 廊下の西はしの階段は、さらに下へ（過去ログの地層）
		warp(
			"to_kakolog",
			2,
			11,
			{ map: "kakolog2", x: 3, y: 2, dir: "down" },
			{ se: "stairs" },
		),
		// 南口は深夜のまちのどおり（駅の入口の階段）へ戻る（座標凍結v2）
		warp(
			"to_street",
			10,
			13,
			{ map: "street", x: 27, y: 10, dir: "left" },
			{ se: "door" },
		),

		// ── 改札（終電は いつでも 来る。きさらぎ駅の 名残へ） ──
		{
			id: "gate",
			x: 18,
			y: 7,
			trigger: "touch",
			through: true,
			run: async (s) => {
				if (!s.flag("seen_hub_train")) await firstTrain(s);
				await s.narrate("改札が　ひらいている。");
				await s.warp("train", 2, 3, "right", { se: "train" });
			},
		},

		// ── 人たち ──
		npc("nemurin", 16, 8, "char:nemurin", nemurin, { dir: "up" }),
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
				if (s.flag("seen_hub_train")) {
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
				if (s.flag("seen_hub_train"))
					await s.narrate("……だれかが、ここで\n終電を　待っていた。");
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
			sprite: STN.chalkCircle,
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
