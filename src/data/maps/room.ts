// キリコの部屋（プロローグの一日の起点。DESIGN §4 時間帯システム・docs/style-everyday.md）。
// 12×10 の室内。ベッド・机・本棚・テレビ・モニター・蓄音機・日記（セーブ）・やかん・ドア。
// ゲームは street（夕方・tod="yu"）から始まり、帰宅で evening（tod を "yoru" に）→
// ベッドで就寝 → tod="shinya" になり、既存の 2:00 の目ざめ（opening）→「散歩してくるンゴ」。
// ドアは apart へ（座標凍結v2: room (5,9) → apart (2,3)）。
// 朝（tod="asa"）は terminus のスクリプトがここへ返す（秒針が戻る・スレが動き出す）。
// BGM は無音。秒針の音（tick）は時間帯ごとに SE で鳴らし分ける。
// 考察バイト（docs/kousatsu-bait.md 技法3）: カレンダーは 2021年3月・15日にまる。
// 小ネタ: テレビの砂あらし →（レコードを持って・3回目）NNN風の名前の放送（note nnn）。
// 読むだけのフラグ（street 担当が set）: got_dinner_onigiri / got_dinner_pan（夕方の買い物）。
// set するフラグ: tod（"yoru"→"shinya"）・seen_asa_thread・seen_clock・seen_tv。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { OBJ } from "../helpers";
import { SPR } from "../sprites";
import { base, INDOOR, PROPS } from "../tiles";

// INDOOR に足すもの: c 壁の貼り紙（カレンダー）
const tiles: Record<string, TileDef> = {
	...INDOOR,
	c: {
		layers: [base(1, 78), PROPS.notice],
		color: "#e8e4dc",
		passable: false,
	},
};

// W 窓 / Q 絵（ポスター） / c カレンダー / k 柱時計 / Z z ベッド / t 机 / B 本棚 / V テレビ / M モニター / n いす
const rows = [
	"############", // y0
	"#HHWHHQHHHH#", // y1  窓 (3,1)・ポスター (6,1)
	"#hhhhchhkhh#", // y2  カレンダー (5,2)・柱時計 (8,2)
	"#Zt..B.V.M.#", // y3  ベッド (1,3)・机 (2,3)・本棚 (5,3)・テレビ (7,3)・モニター (9,3)
	"#z.......n.#", // y4  いす (9,4)。目ざめの場所 (2,4)
	"#..........#", // y5
	"#.........t#", // y6  日記 (2,6)・蓄音機 (5,6)・やかんの台 (10,6)
	"#..........#", // y7
	"#..........#", // y8  apart からの戻り位置 (5,8)
	"#####D######", // y9  ドア (5,9) → apart (2,3)（座標凍結v2）
];

/** レコードを1枚でも持っているか。 */
const anyRecord = (st: { items: Record<string, number> }): boolean =>
	(st.items.rec_a ?? 0) > 0 ||
	(st.items.rec_b ?? 0) > 0 ||
	(st.items.rec_c ?? 0) > 0;

/** 朝のスレの書き込み（名前欄「名無しさん」。声はカメオ音源。DESIGN §5）。 */
const post = (s: Story, who: string, text: string) =>
	s.say(who, text, { name: "名無しさん", noPortrait: true });

/** 晩ごはんの呼び名（street の買い物フラグで決まる。どちらも無ければ戸だなのカップめん）。 */
const dinnerName = (s: Story): string =>
	s.flag("got_dinner_onigiri")
		? "おにぎりの　ふくろ"
		: s.flag("got_dinner_pan")
			? "パンの　ふくろ"
			: "カップめんの　空き";

export const room: MapDef = {
	id: "room",
	name: "キリコの部屋",
	bgm: null,
	outside: "#1b1410",
	tiles,
	rows,
	events: [
		// ── 夕方の帰宅（auto once）。晩ごはんを机に・スレは賑やか・日が落ちて tod="yoru" ──
		// street 側が先に "yoru" へ送っていても取りこぼさないよう、夕方と夜の両方で受ける
		{
			id: "evening",
			x: 5,
			y: 8,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu" || st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(400);
				await s.say("kiriko", "ただいまンゴ");
				if (s.flag("got_dinner_onigiri")) {
					await s.narrate("おにぎりの　ふくろを、\n机に　おいた。");
				} else if (s.flag("got_dinner_pan")) {
					await s.narrate("パンの　ふくろを、\n机に　おいた。");
				} else {
					await s.say("kiriko", "……晩ごはん、\n買いそびれたンゴ");
					await s.narrate("戸だなの　カップめんを、\n机に　おいた。");
				}
				// 日が落ちる（DESIGN §4: room は夜。屋外に出れば夜の色は各マップの地の色）
				s.set("tod", "yoru");
				await s.narrate("窓のそとが、ゆっくり\n暗くなっていく。");
				await s.narrate("モニターを　つけた。\nスレに、あかりが　ともる。");
				await s.narrate("『(´・ω・｀)しごと　おわた』");
				await s.narrate("『(＾ω＾)おかえりお。\nきょうも　おつかれやで』");
				await s.narrate("『(´・ω・｀)なんか外で\n音しない？』");
				await s.say("kiriko", "気のせいやろ、って\n書いておくンゴ");
				await s.narrate("スレを　ながめながら、\n晩ごはんを　たべた。");
				await s.say(
					"kiriko",
					"……今夜も、へいわンゴ。\nたべたら　ねむくなってきた",
				);
			},
		},
		// ── 深夜2:00の目ざめ（auto once）。ベッド（bed）で tod="shinya" になった直後に始まる ──
		{
			id: "opening",
			x: 2,
			y: 4,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(900);
				await s.fadeIn(1200);
				await s.wait(400);
				await s.narrate("……目が　さめた。");
				await s.narrate("時計の音が　しない。\n――2:00。とまっている。");
				await s.say("kiriko", "……まだ　よなかンゴ");
				await s.narrate(
					"ドアの下から、しろい光が\nすじに　なって　もれている。",
				);
				await s.say("kiriko", "……ろうかの電気、\nこんな色だったンゴ？");
				await s.wait(400);
				await s.say("kiriko", "……ねむれそうにないし、\n散歩してくるンゴ");
			},
		},
		// ── 蓄音機がひとりでに回っている（レコードを持って戻ったとき。朝には鳴らさない） ──
		{
			id: "phono_spin",
			x: 6,
			y: 5,
			trigger: "auto",
			once: true,
			when: (st) =>
				anyRecord(st) &&
				!!st.flags["done:room:opening"] &&
				st.flags.tod !== "asa",
			run: async (s) => {
				await s.wait(400);
				s.se("record");
				await s.narrate("――蓄音機が、ひとりでに\nまわっている。");
				await s.narrate("レコードは、\nのせていないのに。");
				s.se("needle");
				await s.narrate("針をあげると、すなおに\nとまった。");
			},
		},
		// ── ドア → アパートの廊下（座標凍結v2: room (5,9) → apart (2,3)） ──
		{
			id: "door",
			x: 5,
			y: 9,
			trigger: "touch",
			through: true,
			run: async (s) => {
				await s.warp("apart", 2, 3, "down", { se: "door" });
			},
		},
		// ── 日記（セーブ）。絵は記録の水晶（helpers.ts の OBJ.save）で代用 ──
		{
			id: "diary",
			x: 2,
			y: 6,
			sprite: OBJ.save,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate(
					"日記帳だ。ひらいたページに\n今日の日付だけ　書いてある。",
				);
				await s.saveMenu();
			},
		},
		// ── 蓄音機（メニューの案内） ──
		{
			id: "phono",
			x: 5,
			y: 6,
			sprite: SPR.phono,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("キリコの　蓄音機だ。");
				await s.narrate(
					"ひろった　レコードは、メニューの\n「レコード」で　いつでも　聞ける。",
				);
			},
		},
		// ── しらべられる家具（見えない talk イベント）。時間帯で一言が変わる ──
		{
			id: "clock",
			x: 8,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					s.se("tick", { volume: 0.7 });
					await s.narrate("かべの時計。秒針が、\nこつこつ　歩いている。");
					return;
				}
				if (t === "asa") {
					s.se("tick", { volume: 0.7 });
					await s.wait(500);
					s.se("tick", { volume: 0.7 });
					await s.narrate("かべの時計。7:04。\n……ちゃんと、うごいている。");
					return;
				}
				await s.narrate("かべの時計。\n――2:00で　とまっている。");
				s.se("tick");
				await s.wait(700);
				if (!s.flag("seen_clock")) {
					s.set("seen_clock");
					await s.say("kiriko", "……いま、動いたンゴ？");
					return;
				}
				await s.narrate("……秒針は、それきり\nうごかない。");
			},
		},
		{
			id: "window",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					s.se("higurashi", { volume: 0.5 });
					await s.narrate("西の空が、あかい。\nヒグラシの声が、とおい。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("むかいの家に、あかり。\nどこかで、犬の声。");
					return;
				}
				if (t === "asa") {
					s.se("suzume", { volume: 0.6 });
					await s.narrate("あさの光。\nスズメが、鳴いている。");
					return;
				}
				await s.narrate("そとは　まっくら。\nまちの明かりが、ひとつもない。");
				await s.narrate("街灯も、信号の色も、\nどこにも　ない。");
			},
		},
		{
			id: "calendar",
			x: 5,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("カレンダー。\n2021年3月の　ままだ。");
				await s.narrate("15日に、まるが　ついている。");
				await s.narrate("なんの日かは、思い出せない。");
			},
		},
		{
			id: "poster",
			x: 6,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("レコードやの　ポスター。\n『中古盤、高価買取』");
				await s.say("kiriko", "……売らないンゴ");
			},
		},
		// ── ベッド。夜はここから就寝（tod="yoru"→"shinya"。目ざめは opening が受ける） ──
		{
			id: "bed",
			x: 1,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"ふとんは　まだ　あたたかい。\n……もう　ねむれる気が　しない。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("ふとんを、なおした。\n……よく　ねた気がする。");
					return;
				}
				// 夕方・夜（tod が無い旧データ・デバッグ起動も、寝れば 2:00 の開幕へ合流できる）
				await s.narrate("ふとんは、ほしたてで\nふかふかだ。");
				const c = await s.choose(["＞＞1 もうねる", "＞＞2 まだおきてる"], {
					cancel: 1,
				});
				if (c !== 0) return;
				await s.narrate("ふとんに　もぐりこんだ。");
				s.se("tick", { volume: 0.6 });
				await s.wait(700);
				s.se("tick", { volume: 0.6 });
				await s.narrate("秒針の音が、\nとおくなっていく――");
				await s.fadeOut(1500);
				await s.wait(600);
				s.se("tick", { volume: 0.5 });
				await s.wait(1400);
				// ここで秒針の音が、やむ。目ざめの場面は opening（auto）が続ける
				s.set("tod", "shinya");
				await s.warp("room", 2, 4, "down", { fade: false });
			},
		},
		// ── 机。夕方に買った晩ごはんが、次の朝まで のこっている ──
		{
			id: "desk",
			x: 2,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					await s.narrate(`机のうえに、${dinnerName(s)}。\nもう、からっぽだ。`);
					return;
				}
				if (t === "shinya") {
					await s.narrate(`机のうえ、ゆうべの\n${dinnerName(s)}が　そのまま。`);
					return;
				}
				if (t === "asa") {
					await s.narrate(
						`机のうえ、ゆうべの\n${dinnerName(s)}が　のこっている。`,
					);
					await s.say("kiriko", "……かたづけるンゴ");
					return;
				}
				await s.narrate("机のうえは、きれいだ。");
				await s.narrate("……こんなに　きれいなのは、\nめずらしい。");
			},
		},
		// ── モニター。夕・夜=賑やか／深夜=止まっている／朝=動き出す（MGRoidらの書き込み） ──
		{
			id: "pc",
			x: 9,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					await s.narrate("スレは、こんやも\nにぎやかだ。");
					await s.narrate("『(´・ω・｀)ふろ、\nどうしよう。めんどい』");
					await s.narrate("『(＾ω＾)はいって\nきなさいお』");
					return;
				}
				if (t === "shinya") {
					await s.narrate("モニターの　あかりだけが、\nついている。");
					await s.narrate(
						"スレは、とまっていた。\nさいごのレスは、ゆうべのまま。",
					);
					await s.say("kiriko", "……みんな、ねてるンゴ");
					return;
				}
				if (t === "asa") {
					if (!s.flag("seen_asa_thread")) {
						s.set("seen_asa_thread");
						await s.narrate("モニターに、あかり。\n（スレが　うごいている。）");
						await post(s, "mgroid", "おはようさん。ひさびさに\n来てもうたわ");
						await post(s, "motroid", "スレ、まだあって草。\nただいまやで");
						await post(
							s,
							"nynroid",
							"朝メシ、おでんの残りに\nするわ。あったまるで",
						);
						await s.say("kiriko", "……吾輩も、あとで\n書くンゴ");
						return;
					}
					await s.narrate("あたらしい書きこみが、\nすこしずつ、ふえていく。");
					return;
				}
				await s.narrate(
					"モニターは　ついていない。\nじぶんの顔だけ、うつっている。",
				);
			},
		},
		{
			id: "shelf",
			x: 5,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("本と、レコードの空き箱。\nどれも　見おぼえがある。");
			},
		},
		// ── テレビ（夕・夜=やきう中継、朝=あさの番組。深夜は砂あらし →まれに NNN → note nnn） ──
		{
			id: "tv",
			x: 7,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const n = Number(s.flag("seen_tv") ?? 0);
				s.set("seen_tv", n + 1);
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					await s.narrate("テレビを　つけた。\nやきう中継。……延長戦だ。");
					await s.say("kiriko", "しあいの　ながい日ンゴ");
					return;
				}
				if (t === "asa") {
					await s.narrate("テレビを　つけた。\nあさの番組が、ながれている。");
					await s.narrate("……ひさしぶりに、\nひとの声で　にぎやかだ。");
					return;
				}
				// 「まれ」は乱数でなく回数で作る：3回目以降＋レコードを持って外から戻ったあと
				// （s.has で見る。items を直に読むと validate がこの分岐をたどれない）
				const rec =
					s.has("rec_a") > 0 || s.has("rec_b") > 0 || s.has("rec_c") > 0;
				if (!s.flag("note_nnn") && n >= 2 && rec) {
					await s.narrate("テレビを　つけた。\n――砂あらしが、ふっと　やんだ。");
					await s.narrate("くらい画面を、白い文字が\nながれていく。");
					await s.narrate(
						"『名無しさん』『名無しさん』\n『名無しさん』『名無しさん』",
					);
					await s.say("kiriko", "……ぜんぶ、おなじ\n名前ンゴ");
					await s.narrate("文字は、しばらく　つづいて、\nふつりと　きれた。");
					await s.note("nnn");
					await s.narrate("あとには、砂あらしだけが\nのこっている。");
					return;
				}
				s.se("hum", { volume: 0.6 });
				await s.narrate("テレビを　つけた。\n――ざあ、と　砂あらし。");
				await s.narrate("なにも　うつらないので、\nけした。");
			},
		},
		{
			id: "kettle",
			x: 10,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					await s.narrate("やかんを　かけた。\nお茶の　じかんだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("やかんは、つめたい。\nあとで　わかしなおすンゴ。");
					return;
				}
				await s.narrate("やかん。さわると、\nほんのり　ぬるい。");
				await s.narrate("……ゆうべの　おちゃの、\nのこりだ。");
			},
		},
	],
};
