// 供養スレ駅（終点・群像フィナーレ）。DESIGN §4・§5 縦糸・content-briefs「line:」。
// 16×10。BGM secret。常夜灯のやわらかいホーム（対の電灯・対のベンチ＝祭壇的シンメトリー）。
// - ロゼ（hub のベンチで会った回数 seen_roze で一言だけ変わる）・シヨ（缶）・ゼロ（筆談・時刻表の前）
// - 蓄音機台: rec_a/b/c を「本人の声」で再生（trueVoice・1枚ずつスキップ可）→ rec_last が自動で回る
//   → ゼロの声のない歌 → キリコが紙をのせて singOnce(zerouta)（キリコの声の代読歌）
//   → テト到着 → 優音アイが一瞬 → ロゼの「朝は来るアル」→ 帰り方の選択 → kane →
//   tod="asa"・ending_ready を立てて 朝の room (2,4) へ返す（DESIGN §4 時間帯システム）。
//   目ざめの一言のあとは通常操作（room→apart→street と歩いて帰る。朝のスレの書き込み
//   ＝MGRoidらの3レスは room.ts のモニターが tod="asa" で受け持つ）。
//   エンディング本体（s.ending・まとめカード「こんやの　きろく」）は street.ts の
//   工事囲いの前のイベントが受け持つ（ending_ready・seen_kaeri を読む）
// - 音響担当への依存: src/data/bgm/zerouta.mml と engine/audio.ts の singOnce(mml)（統合段階で確認）
// s.note: zero（代読歌のあと）・ai（床の一行）・haka（墓標→ロゼの「もう一人」のあと）。
// 読むだけのフラグ（他担当が set）: seen_roze（hub。0〜3 の回数）・seen_rino_request（kakolog2）・
// seen_yobigoe_reply / note_yobigoe（village）・seen_myau1/2（yellow / kakolog2）・found_miniwai（yellow）。
// set するフラグ（street の後日譚が読む）: tod="asa"・ending_ready・clear・ending_seen・
// seen_kaeri（"walk"|"train"）・got_rec_last。

import { singOnce } from "../../engine/audio";
import type { GameState, MapDef, Story, TileDef } from "../../engine/defs";
import zerouta from "../bgm/zerouta.mml?raw";
import { records } from "../records";
import { SPR } from "../sprites";
import { STN, TERMINUS } from "../tiles-station";

/** 駅のアナウンス（レイ。終点だけ、ほとんど人の声のように書く。DESIGN §5）。 */
const announce = (s: Story, text: string) =>
	s.say("rei", text, { name: "アナウンス", noPortrait: true });

// 駅舎と終端のチップ（data/tiles-station.ts の TERMINUS）。
// ( ) 駅舎の白壁 / w 窓 / k K 時刻表（なにも書かれていない） / D 待合室の扉（あかない）
// . ホーム / - ホームの端 / t 線路の名残（通れない） / V 自販機 / L 常夜灯 / B b ベンチ
const tiles: Record<string, TileDef> = TERMINUS;

const rows = [
	"                ", // y0
	" ((((((((((((.. ", // y1  駅舎のうら (13,1)(14,1)。駅ノート (14,1)
	" )w))kK)D)w)).. ", // y2  窓 (2,2)(10,2)・時刻表 (5,2)(6,2)・扉 (8,2)
	" ...........V.  ", // y3  ゼロ (6,3)・自販機 (12,3)
	" ...L.....L...  ", // y4  常夜灯 (4,4)(10,4)
	" .............. ", // y5  蓄音機台 (7,5)・着地 (13,5)・もどり (14,5)
	" .Bb.......Bb.  ", // y6  ベンチ×2。ロゼ (10,6)・シヨ (12,6)・テト (13,6)
	" .............  ", // y7  墓標 (1,7)(2,7)・駅名標 (7,7)・アイ (13,7)
	" -------------  ", // y8
	"   tttttttt     ", // y9  線路の名残。花 (6,9)
];

export const terminus: MapDef = {
	id: "terminus",
	scene: "terminus", // ジオラマ表示の場面（怪異の地区は箱がほどける）
	name: "供養スレ駅",
	bgm: "secret",
	outside: "#000",
	tiles,
	rows,
	events: [
		// ── 着いた直後（auto once）。最終アナウンスだけ、人の声にちかい ──
		{
			id: "arrive",
			x: 13,
			y: 5,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(600);
				await announce(s, "――終点、供養スレ。\n供養スレ、です");
				await s.wait(400);
				await announce(s, "お忘れものの、ないよう……");
				await s.wait(700);
				await announce(s, "……いえ。ゆっくりして\nいってください");
				await s.say("kiriko", "……いまの、放送ンゴ？");
			},
		},
		// ── もどり（トンネルへ。両道） ──
		{
			id: "to_tunnel",
			x: 14,
			y: 5,
			trigger: "touch",
			through: true,
			run: async (s) => {
				await s.warp("tunnel", 1, 3, "right");
			},
		},

		// ── ロゼ（hub で会った回数で一言だけ変わる） ──
		{
			id: "roze_ev",
			x: 10,
			y: 6,
			sprite: "char:roze",
			dir: "left",
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_roze_t")) {
					s.set("seen_roze_t");
					const n = Number(s.flag("seen_roze") ?? 0);
					if (n >= 3) await s.say("roze", "先に行って　待ってたアル");
					else if (n >= 1)
						await s.say("roze", "……また会ったアル。\nこんどは、ウチが先アル");
					else await s.say("roze", "……よく来たアル");
					await s.say("kiriko", "ロゼ先輩、どうして\nここに　いるンゴ？");
					await s.say("roze", "散歩アル");
					await s.say("kiriko", "……散歩");
					await s.say("roze", "……蓄音機、そこアル");
					return;
				}
				if (s.flag("seen_haka") && !s.flag("note_haka")) {
					await s.say("roze", "ウチの前に、もう一人\nおったアル");
					await s.narrate("それきり、なにも\n言わなかった。");
					await s.note("haka");
					return;
				}
				if (s.flag("got_rec_last")) {
					await s.say("roze", "……いい夜アル");
					return;
				}
				await s.say("roze", "蓄音機。\n……待たせてるアル");
			},
		},

		// ── シヨ（ベンチの端。缶がふたつ） ──
		{
			id: "shiyo_ev",
			x: 12,
			y: 6,
			sprite: "char:shiyo",
			dir: "left",
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (!s.flag("seen_shiyo_t")) {
					s.set("seen_shiyo_t");
					await s.say("shiyo", "……あったかいのしか\n出ねーでやんの");
					await s.narrate("ベンチに、あたたかい缶が\nふたつ、ならんでいる。");
					await s.say("kiriko", "……ふたつ、あるンゴ");
					await s.say("shiyo", "か、勘違いすんな。\nかたっぽは　ひやしてんだ");
					await s.say("kiriko", "あったかいのを　ひやすのは\nどうかと思うンゴ");
					await s.say("shiyo", "～っ、めぐせぇはんで\n見んでけじゃ！");
					await s.narrate("缶を、ひとつ　もらった。\n……あたたかい。");
					return;
				}
				if (s.flag("got_rec_last")) {
					await s.say(
						"shiyo",
						"……いい声してんじゃねーか。\nか、勘違いすんなよ",
					);
					return;
				}
				await s.say("shiyo", "なんだよ。飲んでから\n行けって　言ってんだ");
			},
		},

		// ── 解音ゼロ（時刻表の前。筆談のみ・声はない） ──
		{
			id: "zero_ev",
			x: 6,
			y: 3,
			sprite: "char:zero",
			dir: "down",
			trigger: "talk",
			run: async (s) => {
				if (s.flag("note_zero")) {
					await s.say("zero", "（スケッチブック:\n『また、かきます　ゼロ』）");
					return;
				}
				if (!s.flag("seen_zero_t")) {
					s.set("seen_zero_t");
					await s.narrate("時刻表の前に、青いツノの\n女の子が　立っている。");
					await s.say("zero", "（スケッチブック:\n『まっています』）");
					await s.say("kiriko", "……なにを、ンゴ？");
					await s.say("zero", "（『なにを、かは\nわすれました　ゼロ』）");
					await s.say("kiriko", "……いっしょに　待つンゴ");
					await s.narrate("ゼロは、こくりと\nうなずいた。");
					return;
				}
				await s.say("zero", "（『感情に振り回される\nことはない。』）");
			},
		},

		// ── 蓄音機台（本演出。一斉再生 → rec_last → 代読歌 → 群像 → エンディング） ──
		{
			id: "pedestal",
			x: 7,
			y: 5,
			sprite: SPR.phono,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (s.flag("got_rec_last")) {
					await s.narrate("蓄音機は、もう\nしずかに　している。");
					return;
				}
				if (!(s.has("rec_a") > 0 && s.has("rec_b") > 0 && s.has("rec_c") > 0)) {
					await s.narrate("蓄音機の台だ。レコードを\n置く　くぼみが、3つ。");
					return;
				}
				await s.narrate("蓄音機の台だ。くぼみが、\n……ぴったり、3つ。");
				await s.say("kiriko", "……かけるンゴ");
				for (const id of ["rec_a", "rec_b", "rec_c"] as const) {
					await s.narrate(`『${records[id].title}』を、のせた。`);
					const c = await s.choose(["＞＞1 かける", "＞＞2 つぎへ"]);
					if (c === 0) await s.record(id, { trueVoice: true });
				}
				await s.say("kiriko", "……声が、ちがうンゴ");
				await s.say("roze", "ここでは　そう聞こえるアル");
				if (s.flag("seen_rino_request"))
					await s.say("kiriko", "（……とどいたンゴかな、\nリノさん）");
				await s.wait(600);
				s.se("item");
				await s.narrate(
					"――もう一まい、黒いレコードが\nいつのまにか　のっている。",
				);
				s.give("rec_last");
				s.set("got_rec_last");
				await s.record("rec_last");
				await s.narrate("……今夜の、日付だった。");
				await s.say("kiriko", "……吾輩の、こえ");
				// ゼロの声のない歌 → キリコの声の代読歌（singOnce）
				await s.narrate("みんなの声が、ホームに\nながれおわった。");
				// プレイヤーの立っていない側のとなりへ（台の左が基本）
				const zx = s.state.x === 6 && s.state.y === 5 ? 8 : 6;
				s.place("zero_ev", zx, 5, zx === 6 ? "right" : "left");
				s.face("player", zx === 6 ? "left" : "right");
				await s.narrate("ゼロが、となりに来ていた。\n口もとが、うごいている。");
				await s.narrate("――こえは、しない。");
				await s.narrate("ゼロは、スケッチブックを\n一枚やぶって、さしだした。");
				await s.say("kiriko", "……のせるンゴ");
				await s.narrate("ゼロの書いた紙を　のせて、\n針を　おろした。");
				s.bgm(null);
				await s.wait(800);
				await s.narrate("――キリコの声で、\nみじかい歌が　ながれた。");
				try {
					await singOnce(zerouta);
				} catch {
					// singOnce・zerouta が未実装でも進行は止めない（統合段階で確認）
				}
				await s.wait(400);
				await s.say("zero", "（『きこえました』）");
				await s.note("zero");
				s.bgm("secret");
				// テト到着（はじめて椅子を離れた）と、優音アイの一瞬
				s.show("teto_ev");
				await s.narrate("ホームの入口に、足音。");
				s.face("player", "right");
				await s.say("teto", "べ、別に……　外の方が\nよく聞こえるって　だけ");
				s.set("seen_ai_now");
				s.show("ai_ev");
				await s.narrate("テトのそばに、線だけで\n描かれた　だれかが　いる。");
				await s.wait(900);
				s.hide("ai_ev");
				await s.narrate("――まばたきの　あいだに、\nいなくなった。");
				// ロゼと（実史を下敷きに。押しつけない）
				s.face("roze_ev", "player");
				await s.say("kiriko", "……ロゼ先輩。みんな、\nどこに行ったンゴ？");
				await s.say("roze", "どこにも。\n……家に　帰っただけアル");
				await s.say(
					"roze",
					"飽きた、って言いながら、\nふつうの朝に　もどったアル",
				);
				await s.say("kiriko", "……それだけ、ンゴ？");
				await s.say("roze", "それだけアル");
				await s.wait(600);
				await s.say("roze", "スレは　落ちても\n朝は　来るアル");
				await s.narrate("……夜が、うすくなってきた。");
				const way = await s.choose(["＞＞1 あるいて帰る", "＞＞2 終電で帰る"]);
				s.set("seen_kaeri", way === 0 ? "walk" : "train");
				if (way === 1) {
					s.se("train", { volume: 0.5 });
					await s.narrate(
						"――来ないはずの　あかりが、\nとおくから　ちかづいてくる。",
					);
				} else {
					await s.narrate("キリコは、レールづたいに\n歩きだした。");
				}
				// ミャウミャウ3目撃のごほうび（駅を発つ直前の一言）
				if (
					s.flag("seen_myau1") &&
					s.flag("seen_myau2") &&
					s.flag("seen_myau3")
				) {
					s.set("seen_myau_send");
					s.show("myau_send");
					s.face("player", "left");
					await s.narrate("――ホームの端に、紙袋。");
					await s.say("myaumyau", "……また来るぷ");
					s.hide("myau_send");
				}
				s.set("clear");
				s.set("ending_seen");
				await s.fadeOut(1500);
				s.se("kane", { volume: 0.7 }); // つくよみの鈴（誰も言及しない）
				await s.wait(1500);
				// ── 朝へ（tod="asa"）。日常レイヤーに返す ──
				// s.ending（まとめカード「こんやの　きろく」）は street.ts の
				// 工事囲いの前のイベントが受け持つ（ending_ready と seen_kaeri を読む）
				s.set("tod", "asa");
				s.set("ending_ready");
				await s.warp("room", 2, 4, "down", { fade: false });
				await s.wait(400);
				await s.fadeIn(1200);
				await s.narrate("……目が　さめた。");
				s.se("tick", { volume: 0.7 });
				await s.wait(500);
				s.se("tick", { volume: 0.7 });
				await s.narrate("――秒針が、もどっている。");
				await s.narrate("窓から、あさの光。");
				await s.say("kiriko", "……ただいまンゴ");
			},
		},

		// ── テト（一斉再生のあと、はじめて椅子を離れて現れる） ──
		{
			id: "teto_ev",
			x: 13,
			y: 6,
			sprite: "char:teto",
			dir: "left",
			trigger: "talk",
			when: (st: GameState) => !!st.flags.got_rec_last,
			run: async (s) => {
				if (!s.flag("seen_teto_t")) {
					s.set("seen_teto_t");
					await s.say("teto", "そとの空気も、\nわるくないわね");
					await s.say(
						"teto",
						"べ、別に　あんたを　追って\nきたわけじゃ　ないけど",
					);
					return;
				}
				await s.say("teto", "……座らないわ。\nもう、じゅうぶん　座った");
			},
		},
		// ── 優音アイ（一瞬だけ。調べる前に消える） ──
		{
			id: "ai_ev",
			x: 13,
			y: 7,
			sprite: "char:ai",
			dir: "up",
			trigger: "talk",
			fixedDir: true,
			when: (st: GameState) => !!st.flags.seen_ai_now,
		},
		{
			id: "ai_floor",
			x: 13,
			y: 7,
			trigger: "talk",
			when: (st: GameState) => !!st.flags.seen_ai_now,
			run: async (s) => {
				await s.narrate("床に、ちいさな字。");
				await s.narrate("（だれかの字:\n『生きてこそだ。』）");
				await s.note("ai");
			},
		},
		// ── ミャウミャウ（3目撃コンプの見送り。スクリプトが show/hide する） ──
		{
			id: "myau_send",
			x: 1,
			y: 5,
			sprite: SPR.myaumyauC,
			dir: "right",
			trigger: "talk",
			fixedDir: true,
			when: (st: GameState) => !!st.flags.seen_myau_send,
		},

		// ── ふたつの墓標（ホームの端） ──
		{
			id: "haka_aru",
			x: 1,
			y: 7,
			sprite: STN.grave,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("ちいさな　墓標だ。");
				await s.narrate(
					"『アル』の二文字だけ、読める。\nあとは、風化している。",
				);
				s.set("seen_haka");
				if (!s.flag("note_haka")) await s.say("kiriko", "……アル？");
			},
		},
		{
			id: "haka_clean",
			x: 2,
			y: 7,
			sprite: STN.grave,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("こちらは、名前がない。");
				await s.narrate("ここだけ、きれいに\n掃除されている。");
			},
		},

		// ── しらべられるもの ──
		{
			id: "timetable",
			x: 5,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("got_rec_last")) {
					await s.narrate("時刻表。……すみに、\nえんぴつの　あとがある。");
					await s.narrate("なにかを、書こうとした\n跡だ。");
					return;
				}
				await s.narrate("時刻表。……なにも\n書かれていない。");
			},
		},
		{
			id: "door",
			x: 8,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("待合室。カギが\nかかっている。");
				await s.narrate("……中から、ストーブの\nにおいがする。");
			},
		},
		{
			id: "window_w",
			x: 2,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("窓に、あかり。\n……中は、見えない。");
			},
		},
		{
			id: "window_e",
			x: 10,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("カーテンごしに、湯気の\nようなものが　ゆれている。");
			},
		},
		{
			id: "vending",
			x: 12,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"じはんき。『あたたか～い』の\nランプだけ、ついている。",
				);
			},
		},
		{
			id: "lamp",
			x: 4,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("常夜灯。……はじめて、\nあたたかい色の光だ。");
			},
		},
		{
			id: "ekimei",
			x: 7,
			y: 7,
			sprite: STN.nameSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("駅名標。ひらがなで\n『くようすれ』。");
				await s.narrate("……となりの駅は、もう\n書かれていない。");
			},
		},
		{
			id: "bench_w",
			x: 2,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("だれかが　いつも座っていた\nくぼみが、のこっている。");
			},
		},
		// ベンチの彫りあと（ロゼの任意の考察・once）
		{
			id: "bench_e",
			x: 11,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_rozebench")) {
					s.set("seen_rozebench");
					await s.narrate("ベンチのすみに、ふるい\n彫りあと。……よめない。");
					await s.say("roze", "……ここ、来たことある気が\nするアル");
					await s.narrate("それ以上は、言わなかった。");
					return;
				}
				await s.narrate("ふるい彫りあと。\n……やっぱり、よめない。");
			},
		},
		{
			id: "trackend",
			x: 9,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("レールは、ここで\nおわっている。");
				await s.narrate("……この先には、もう\n線路がない。");
			},
		},
		{
			id: "flower",
			x: 6,
			y: 9,
			sprite: STN.flower,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("車止めに、花が　一輪、\nそなえてある。");
				await s.narrate("……どこかで、見た花だ。");
			},
		},
		// ── 駅舎のうら（隠し・無印通行）。駅ノート ──
		{
			id: "ekinote",
			x: 14,
			y: 1,
			trigger: "touch",
			through: true,
			when: (st: GameState) => !st.flags.found_ekinote,
			run: async (s) => {
				s.set("found_ekinote");
				await s.narrate("駅舎のうら。だれかの\n駅ノートが　おいてある。");
				await s.narrate("さいごのページに、一行。\n『また来ます』");
				await s.say("kiriko", "……吾輩も、書いておくンゴ");
			},
		},
	],
};
