// アパートの廊下（キリコの階）。DESIGN §4・docs/content-briefs.md「日常レイヤー」・
// docs/style-everyday.md。12×8・室内（outdoor なし）・BGM null。
// 徹底して普通に作る。時間帯の差分は生活の痕跡だけ（2026-10-04 に段と回収をつけた）：
//   夕方 … どこかの部屋のテレビの音・さんまのにおい・となりの不在票・かさが三本・503 のあたらしい表札
//   宵   … せんたくきの音・502 からナイターの実況・503 のシャワーの音・蛍光灯に虫が来る
//           （docs/nostalgia.md P0-1・P0-2。人は出さない。部屋のテレビで中継の打ち切りを見た人
//           ＝seen_chukei_end には、502 はチャンネルをかえている。ラジオは出さない＝続きをラジオで
//           聞くのは kokudo・umi・danchi。数字は言わない）
//   深夜 … せんたくきは止まっている・宵の虫がまだまわっている（人も声も出さない。灯るのは自分の部屋だけ）
//   朝   … となりのドアの前にたたんだダンボール・かさが二本・牛乳・朝刊のスポーツらん・
//           502 のみそしる・503 のめざまし（生活が続いている payoff）
//
// ほかの地区の前振りを読む所: door_room（深夜。kawara の seen_taigan_shinya → ドアのすきまの灯り＝⑫）・
// kasa（朝。room tv の seen_tenki＝⑲）・d502（宵。room tv の seen_chukei_end）・
// d503（朝。street tenshu の seen_tenshu2）・shimi（朝。umi の seen_kyori_0＝②）。
// keiji の seen_keiji は danchi gomi_asa・sumire gomidashi の朝が読む（⑯。keiji の朝は読まない）。
// arrive_yoru の done:apart:arrive_yoru は street laundry（朝）と、この地区の arrive_shinya が読む。
//
// 座標凍結v2: キリコの部屋のドア (2,2)→room(5,8)／room からの戻り (2,3)／
// 階段 (10,6)→street(2,10)／street からの戻り (10,5)。
// 夕方だけ、部屋に入る前に「もう帰る？」の確認を挟む（時間を送る操作に意味を持たせる。
// style-everyday §1。晩ごはん未購入ならひとことだけ添える）。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { warp } from "../helpers";
import {
	arrived,
	numFlag,
	OUTDOOR_DAILY,
	strFlag,
	yoruAkubi,
} from "../nostalgia";
import { APART } from "../tiles";

//   D  キリコの部屋のドア（通れる。warp を置く）   q  となりの部屋のしまった戸
//   B  郵便受け（北の壁ぎわに立てて廊下から表を調べる）
//   u  かさ立て   >  下り階段
// 絵は自作チップ（data/tiles.ts の APART・scripts/make-home-tiles.mjs）
const tiles: Record<string, TileDef> = APART;

const rows = [
	"############", // y0
	"#HHHHHHHHHH#", // y1
	"#hDBBqhhqhh#", // y2  キリコの部屋 (2,2)・郵便受け (3,2)(4,2)・502 (5,2)・503 (8,2)・掲示 (6,2)
	"#..........#", // y3  room からの戻り (2,3)・マット (2,3)・牛乳箱 (5,3)
	"#..........#", // y4  蛍光灯 (5,4)・てんじょうのしみ (8,4)
	"#..........#", // y5  street からの戻り (10,5)・窓 (11,5)
	"#urrxrrrrr>#", // y6  かさ立て (1,6)・消火器 (4,6)・階段 (10,6)
	"############", // y7
];

/** 晩ごはんを買ったか（street の店主。フラグだけ）。 */
const hasDinner = (s: Story): boolean =>
	!!(s.flag("got_dinner_onigiri") || s.flag("got_dinner_pan"));

export const apart: MapDef = {
	id: "apart",
	name: "アパートの廊下",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	// 深夜は自室と同じ曲（room.ts。家の中は外と別の曲で、廊下を出入りしても切れない）
	todBgm: { shinya: "amb_kansouki" },
	outside: "#14120e",
	tiles,
	rows,
	// ジオラマ表示の差し色の源（?classic の屋内では使わない）
	lights: [{ x: 5, y: 4, r: 2, color: "#b8cce0" }], // 蛍光灯
	events: [
		// ── 着いたとき（夕方: 生活音とさんま／宵: せんたくき／深夜: 止まったせんたくき。どれも一度だけ） ──
		{
			id: "arrive_yu",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu",
			run: async (s) => {
				await s.wait(400);
				await s.narrate("どこかの部屋から、\nテレビの音がしている。");
				// さんまは 502（朝の d502 が「ゆうべは　さんま」で読む）
				await s.narrate("さんまを　やく　においも、\nすこし。");
			},
		},
		// 宵は部屋から出た最初の一回（apart は宵の段 yoruStep に数えない。あくびの判定だけ通す）
		{
			id: "arrive_yoru",
			x: 2,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(400);
				await s.narrate("どこかの部屋で、\nせんたくきが　まわっている。");
				await yoruAkubi(s);
			},
		},
		// 深夜も部屋から出た最初の一回（apart は shinyaStep に数えない）。
		// 宵のせんたくき（arrive_yoru）を聞いた人には、止まったあと。聞いていない人は蛍光灯の音だけ
		{
			id: "arrive_shinya",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(400);
				if (arrived(s, "apart", "yoru")) {
					await s.narrate("せんたくきの　音は、\nもう　とまっている。");
					return;
				}
				await s.narrate("廊下の　蛍光灯が、\nじー、と　鳴っている。");
			},
		},
		// ── 出入り口（座標凍結v2） ──
		{
			id: "door_room",
			x: 2,
			y: 2,
			trigger: "touch",
			through: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					await s.narrate("うちのドアだ。");
					if (!hasDinner(s))
						await s.say("kiriko", "（……晩ごはん、まだ\n買ってないンゴ）");
					const i = await s.choose(["＞＞1 へやに入る", "＞＞2 まだ歩く"], {
						cancel: 1,
					});
					if (i !== 0) {
						await s.move("player", "d");
						return;
					}
				}
				// ⑫ 深夜のかわらで「電気、けしてきたっけ」（kawara taigan_view の seen_taigan_shinya）と
				// 思った人だけ、帰りに一度。自分の部屋の灯り（P0-5）。キリコの「やっぱり」は かわらの
				// 問いへの答え（street my_win の深夜で先に気づいた人にも通じる）。
				// room pc（shinya）の「モニターの　あかりだけが、ついている」とつながる
				if (
					t === "shinya" &&
					s.flag("seen_taigan_shinya") &&
					!s.flag("seen_denki_kaishu")
				) {
					s.set("seen_denki_kaishu");
					await s.narrate(
						"ドアの　すきまから、\nあおい　あかりが　もれている。",
					);
					await s.say("kiriko", "（……やっぱり、\nつけっぱなしンゴ）");
				}
				// げんかんマット (2,3) をまたいで入る（mat の段）。なおした tod に「_fumi」をつける
				// ＝なおしたあとに、ほんとうに またいだときだけ よれる
				const mat = strFlag(s, "seen_mat");
				if (mat && !mat.endsWith("_fumi")) s.set("seen_mat", `${mat}_fumi`);
				await s.warp("room", 5, 8, "up", { se: "door" });
			},
		},
		warp(
			"stairs_ev",
			10,
			6,
			{ map: "street", x: 2, y: 10, dir: "down" },
			{ se: "stairs" },
		),

		// ── しらべられるもの（ノルマ12個） ──
		// 蛍光灯の虫の段（宵に一ぴき来る seen_mushi → 深夜もまだまわっている → 朝はいない）。
		// 明滅のような違和感としては作らない
		{
			id: "fluor",
			x: 5,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					s.set("seen_mushi");
					await s.narrate("蛍光灯に、小さな虫が\n一ぴき　来ている。");
					return;
				}
				if (t === "shinya") {
					if (s.flag("seen_mushi")) {
						await s.narrate("あの　虫が、まだ\nまわっている。");
						await s.say("kiriko", "（……おまえも、\nねないンゴか）");
						return;
					}
					await s.narrate(
						"見あげると、蛍光灯。\n小さな虫が、一ぴき　まわっている。",
					);
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_mushi")) {
						await s.narrate("朝の光。蛍光灯の　虫は、\nどこかへ　行った。");
						return;
					}
					await s.narrate("朝の光で、蛍光灯は\nほとんど　目だたない。");
					return;
				}
				await s.narrate("見あげると、蛍光灯。\nしろい、ふつうの光だ。");
			},
		},
		// ⑯ ゴミの日。夕・宵に読んだ人は seen_keiji（danchi gomi_asa・sumire gomidashi の朝が読む）。
		// 深夜は「夜に出すのは」の一枚だけ、朝は火・金の一枚と、きょうが火ようのこと（9/14 は火よう。
		// 朝の一言は全員に出す＝フラグは読まない）
		{
			id: "keiji",
			x: 6,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				await s.narrate("かべの掲示。");
				if (t === "shinya") {
					await s.narrate("『夜に　出すのは\nやめましょう』");
					return;
				}
				if (t === "asa") {
					await s.narrate("『もえるゴミは　火・金』");
					await s.say("kiriko", "（……きょうは、火ようンゴ）");
					return;
				}
				s.set("seen_keiji");
				await s.narrate("『もえるゴミは　火・金』");
				await s.narrate("『夜に　出すのは\nやめましょう』");
			},
		},
		// うちの郵便受け。ピザやのチラシの段（夕: 『よる11時まで』→ 宵: 晩ごはんのあと →
		// 深夜: あしたの晩ごはん）。朝は朝刊（ナイターの結果。P0-2）
		{
			id: "mybox",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					await s.narrate("ピザやの　チラシ。");
					await s.say("kiriko", "（……晩ごはんは、\nもう　すんだンゴ）");
					return;
				}
				if (t === "shinya") {
					await s.narrate("チラシの『よる11時まで』。");
					await s.say("kiriko", "（……あしたの　晩ごはん、\nこれに　するンゴ）");
					return;
				}
				if (t === "asa") {
					await s.narrate("うちの郵便受けに、\n朝刊が　ささっている。");
					// ゆうべのナイターの結果（nostalgia.md P0-2。数字を言い切るのはここ1か所だけ）。
					// スポーツらんもキリコの一言も、部屋のテレビで中継を見た人にだけ
					// （P0-11・§5: フラグの無い人の朝は現行と同一。前ぶりの無い人に結果だけを見せない）
					if (numFlag(s, "seen_tv_yoru") > 0 || s.flag("seen_chukei_end")) {
						await s.narrate("スポーツらん。延長12回、\nひきわけ、だった。");
						await s.say("kiriko", "……ねてて　正解ンゴ");
					}
					return;
				}
				await s.narrate("うちの郵便受け。ピザやの\nチラシ。『よる11時まで』");
			},
		},
		// となりの郵便受け。不在票の段（夕: 不在票 seen_fuzai → 宵: とりこまれている →
		// 朝: ドアの前にたたんだダンボール）。宵・深夜は人を出さず、物の変化だけ。
		// 夕方に不在票を見ていない人の朝は、チラシ一枚（前振りの無い回収を見せない）
		{
			id: "nbox",
			x: 4,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				const fuzai = !!s.flag("seen_fuzai");
				if (t === "yoru") {
					await s.narrate(
						fuzai
							? "となりの　郵便受け。\n不在票は、とりこまれている。"
							: "となりの　郵便受け。",
					);
					return;
				}
				if (t === "shinya") {
					await s.narrate("となりの　郵便受け。\nチラシが　一枚。");
					return;
				}
				if (t === "asa") {
					if (fuzai) {
						await s.narrate("となりの　ドアの前に、\nたたんだ　ダンボール。");
						await s.say("kiriko", "……うけとれたンゴね");
						return;
					}
					await s.narrate("となりの郵便受けに、\nチラシが　一枚。");
					return;
				}
				s.set("seen_fuzai");
				await s.narrate("となりの郵便受けに、\n不在票が　はさんである。");
			},
		},
		{
			id: "d502",
			x: 5,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("502ごう室。\nしずかだ。");
					return;
				}
				if (t === "asa") {
					// 夕方の「さんまを　やく　におい」（arrive_yu）をかいだ人には、ゆうべとけさを並べる
					if (arrived(s, "apart", "yu")) {
						await s.narrate(
							"502ごう室。ゆうべは　さんま、\nけさは　みそしるの　におい。",
						);
						return;
					}
					await s.narrate("502ごう室。みそしるの\nにおいがする。");
					return;
				}
				// 宵は、部屋のテレビと同じナイター（nostalgia.md P0-2）。
				// 部屋のテレビで中継の打ち切りを見た人（room tv の seen_chukei_end）には、
				// となりもチャンネルをかえている（ラジオは出さない＝続きをラジオで聞くのは
				// kokudo・umi・danchi b_win_tv。「消えた」とは書かない）。
				// どちらの枝も、ひざを　たたく音（502 の人のくせ）で しめる
				if (t === "yoru") {
					await s.narrate(
						s.flag("seen_chukei_end")
							? "502ごう室。ドアごしに、\nチャンネルを　かえる　音が　つづく。"
							: "502ごう室。ドアごしに、\nナイターの　実況。",
					);
					await s.narrate("ときどき、ぽんと\nひざを　たたく音。");
					return;
				}
				await s.narrate("502ごう室。テレビの音が\nもれている。");
			},
		},
		// 503 は、キリコよりあとに越してきた人（夕方に一度だけ seen_503）。宵はシャワーの音、
		// 深夜はしずか（他人の部屋の灯りは出さない）、朝はめざまし。
		// 夕方の店主の「カーテンが　しまったまま」（street tenshu の seen_tenshu2）を聞いた人には、
		// きょうはキリコのほうが早い。それが無くて夕方の「あとに来た人」（seen_503）を見た人には
		// 「しんいりさん」で返す。どちらも無い人は「おきないンゴか」
		{
			id: "d503",
			x: 8,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("503ごう室。\n――こちらも、しずかだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("めざましが、まだ\n鳴っている。");
					if (s.flag("seen_tenshu2")) {
						await s.say("kiriko", "（きょうは、吾輩の\nほうが　はやいンゴ）");
						return;
					}
					if (s.flag("seen_503")) {
						await s.say("kiriko", "（……しんいりさん、\nねぼうンゴか）");
						return;
					}
					await s.say("kiriko", "……おきないンゴか");
					return;
				}
				if (t === "yoru") {
					await s.narrate("503ごう室。ドアの　むこうで、\nシャワーの　音。");
					return;
				}
				await s.narrate("503ごう室。ひょうさつが\nあたらしい。");
				if (!s.flag("seen_503")) {
					s.set("seen_503");
					await s.say("kiriko", "（吾輩より、あとに\n来た人ンゴ）");
				}
			},
		},
		// ⑲ かさ立ての段。夕・宵・深夜に見た人は seen_kasa → 朝は一本へっている。
		// 部屋のテレビで「あしたは、はれ」を聞いた人（room tv の seen_tenki）だけ、キリコがひとこと。
		// 見ていない人の朝は、二本あるだけ（へったとは書かない）。
		// 深夜は「のまま／そのまま」を使わない（danchi b_stairs の「かさは、そのままだ」と重ねない）
		{
			id: "kasa",
			x: 1,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (!s.flag("seen_kasa")) {
						await s.narrate("かさ立てに、かさが　二本。");
						return;
					}
					await s.narrate("かさ立ての　かさが、\n二本に　へっている。");
					if (s.flag("seen_tenki"))
						await s.say("kiriko", "（はれ　なのに、\nもってったンゴ）");
					return;
				}
				s.set("seen_kasa");
				if (t === "shinya") {
					await s.narrate(
						"かさ立て。蛍光灯の下に、\nもち手が　三つ　ならんでいる。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("かさが　三本。どれも、\nかわいている。");
					return;
				}
				await s.narrate("かさ立て。\nかさが　三本。");
			},
		},
		{
			id: "milk",
			x: 5,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("502の前に、牛乳箱。");
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("あたらしい牛乳が、\n一本入っている。");
					return;
				}
				// 宵の文に「からっぽ」を出さない（nostalgia.md P0-1 の受け入れ条件）
				if (t === "yoru") {
					await s.narrate("ふたに、配達の　シール。");
					return;
				}
				await s.narrate("――からっぽだ。");
			},
		},
		// げんかんマットの段（seen_mat＝最後になおした時間帯の字。nostalgia.ts のフラグ表）。
		// なおしたあと、マットをまたいで部屋に入ると door_room が「_fumi」をつける（"yu_fumi" など）。
		// 「_fumi」のときだけ また よれている（朝は「ひと晩で」。朝になおして朝に またいだ
		// "asa_fumi" は、ひと晩ではないので「くつ」）。「_fumi」の無い字は まっすぐのまま
		// （深夜になおして階段から出て、street の窓で朝になった人は、マットをまたいでいない）。
		// 字でない値（validate の true など）は「よれている」扱い
		{
			id: "mat",
			x: 2,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = strFlag(s, "tod") ?? "yu";
				if (!s.flag("seen_mat")) {
					await s.narrate("うちの　げんかんマット。\nすこし、よれている。");
					await s.narrate("まっすぐに　なおした。");
					s.set("seen_mat", t);
					return;
				}
				const m = strFlag(s, "seen_mat");
				if (m && !m.endsWith("_fumi")) {
					await s.narrate("マットは、まっすぐの　まま。");
					return;
				}
				await s.narrate("マットが、また　よれている。");
				await s.say(
					"kiriko",
					t === "asa" && m !== "asa_fumi"
						? "（……ひと晩で、なんども\nまたいだンゴ）"
						: "（……吾輩の　くつンゴ）",
				);
				await s.narrate("まっすぐに　なおした。");
				s.set("seen_mat", t);
			},
		},
		{
			id: "ext",
			x: 4,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("しょうかき。点検のふだは、\nことしの日づけだ。");
			},
		},
		// ② てんじょうのしみ。夕・宵・深夜に3地区以上 歩いた人には「川みたいな　すじ」が
		// 目に入る（形が変わったとは書かない）。朝、うみの きょり標0（umi kyori_0 の seen_kyori_0）を
		// 見た人だけ、キリコが町を重ねる
		{
			id: "shimi",
			x: 8,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const walked = OUTDOOR_DAILY.filter(
					(m) =>
						arrived(s, m, "yu") ||
						arrived(s, m, "yoru") ||
						arrived(s, m, "shinya"),
				).length;
				if (walked >= 3)
					await s.narrate("てんじょうの　しみ。\n……川みたいな　すじが　ある。");
				else
					await s.narrate("てんじょうに、しみ。\nなにかの地図みたいな形だ。");
				if (s.flag("tod") === "asa" && s.flag("seen_kyori_0"))
					await s.say("kiriko", "（ここが　かわらで……\nはしっこが、うみンゴ）");
			},
		},
		{
			id: "win_st",
			x: 11,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"かいだんの窓。まちの明かりが\nほとんど　きえている。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("あさの光が、かいだんに\nさしこんでいる。");
					return;
				}
				// 宵は灯りだけ（夕やけの文に落とさない。nostalgia.md P0-1）
				if (t === "yoru") {
					await s.narrate("かいだんの窓から、\nまちの灯りが　点々。");
					return;
				}
				await s.narrate("かいだんの窓から、夕やけ。\nまちが、あかね色だ。");
			},
		},
	],
};
