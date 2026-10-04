// アパートの廊下（キリコの階）。DESIGN §4・docs/content-briefs.md「日常レイヤー」・
// docs/style-everyday.md。12×8・室内（outdoor なし）・BGM null。
// 徹底して普通に作る。時間帯の差分は生活の痕跡だけ（2026-10-04 に段と回収をつけた）：
//   夕方 … どこかの部屋のテレビの音・さんまのにおい・となりの不在票・かさが三本・503 のあたらしい表札
//   宵   … せんたくきの音・502 からナイターの実況・503 のシャワーの音・蛍光灯に虫が来る
//           （docs/nostalgia.md P0-1・P0-2。人は出さない。部屋のテレビで中継の打ち切りを見た人
//           ＝seen_chukei_end には、502 はチャンネルをかえている。ラジオは出さない＝続きをラジオで
//           聞くのは kokudo・umi・danchi。数字は言わない）
//   深夜 … せんたくきは止まっている・夕方のテレビの音はもうしない（arrive_yu の人）・
//           宵の虫がまだまわっている・牛乳箱のあき瓶・土手の街灯の列・となりのドアの前はまだ何もない・
//           ピザやのチラシをポケットへ（人も声も出さない。灯る部屋は自分の部屋だけ＝他人の窓の灯りは出さない）
//   朝   … となりのドアの前にたたんだダンボール・かさが二本・牛乳・朝刊のスポーツらん・
//           502 のみそしる・503 のめざまし（生活が続いている payoff）
//
// ほかの地区の前振りを読む所: door_room（深夜。kawara の seen_taigan_shinya・street my_win の
// seen_mywin_ao・danchi a_stairs の seen_danchi_ue → ドアのすきまの灯り＝⑫）・
// kasa（朝。room tv の seen_tenki＝⑲）・d502（宵。room tv の seen_chukei_end）・
// d503（朝。street tenshu の seen_tenshu2）・shimi（朝。umi の seen_kyori_0・seen_umi_hashikko＝②）・
// win_st（深夜。kawara fumiato の seen_suwari_kawara・taigan_view の seen_taigan_shinya）・
// milk（朝。street の店主の「ぎゅうにゅうは　あるかい」＝got_dinner_pan で got_gyunyu の無い人）・
// keiji（深夜。sumire gomi の seen_gomi_hayai＝⑯）・mybox（朝。room tv の seen_tv_yoru・seen_chukei_end）。
// keiji の seen_keiji は danchi gomi_asa・sumire gomidashi の朝が読む（⑯。keiji の朝は読まない）。
// mybox の got_pizza_chirashi（深夜）は room desk の朝が読む（㊻）。
// この地区の中の段: d502 の seen_502_yakiu（宵）→ mybox（朝）・d503 の seen_503_yoru（宵）→ d503（深夜）・
// milk の seen_gyunyu_bako（宵・深夜のあき瓶）→ milk（朝）・win_st の seen_winst_shinya（深夜）→ win_st（朝）。
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
	"            ", // y0
	" HHHHHHHHHH ", // y1
	" hDBBqhhqhh ", // y2  キリコの部屋 (2,2)・郵便受け (3,2)(4,2)・502 (5,2)・503 (8,2)・掲示 (6,2)
	" .......... ", // y3  room からの戻り (2,3)・マット (2,3)・牛乳箱 (5,3)
	" .......... ", // y4  蛍光灯 (5,4)・てんじょうのしみ (8,4)
	" .......... ", // y5  street からの戻り (10,5)・窓 (11,5)
	" urrxrrrrr> ", // y6  かさ立て (1,6)・消火器 (4,6)・階段 (10,6)
	"            ", // y7
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
		// 宵のせんたくき（arrive_yoru）を聞いた人には、止まったあと。夕方だけの人はテレビが消えたこと
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
				// 夕方のテレビ（arrive_yu）を聞いた人だけ、それが消えたこと。
				// 夕方も宵も通っていない人は何も言わない（蛍光灯の音は fluor の深夜にまかせる）
				if (arrived(s, "apart", "yu"))
					await s.narrate("夕方の　テレビの音は、\nもう　どこからも　しない。");
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
				// ⑫ 深夜に、外から自分の部屋の灯りを気にした人だけ、帰りに一度。自分の部屋の灯り（P0-5）。
				// 読み手は3つ: かわらの「電気、けしてきたっけ」（kawara taigan_view の seen_taigan_shinya）・
				// 通りの「モニター、けしてきたっけ」（street my_win の seen_mywin_ao）・
				// 団地のいちばん上から見えた『あおい窓』（danchi a_stairs ichibanUe の seen_danchi_ue）。
				// キリコの「やっぱり」は かわら・通りの問いへの答え、団地だけの人は団地の問い
				// （「あれ、吾輩の　へやンゴ？」＝だれの部屋か）への答えだけにする。何の灯りかは言わず、
				// room pc（shinya）の「モニターの　あかりだけが、ついている」に残す
				const toi = !!(s.flag("seen_taigan_shinya") || s.flag("seen_mywin_ao"));
				if (
					t === "shinya" &&
					(toi || s.flag("seen_danchi_ue")) &&
					!s.flag("seen_denki_kaishu")
				) {
					s.set("seen_denki_kaishu");
					await s.narrate(
						"ドアの　すきまから、\nあおい　あかりが　もれている。",
					);
					await s.say(
						"kiriko",
						toi
							? "（……やっぱり、\nつけっぱなしンゴ）"
							: "（……あれ、やっぱり\n吾輩の　へやだったンゴ）",
					);
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
		// 深夜は「夜に出すのは」の一枚だけ。すみれ町の深夜に、もう出してある ふくろ（sumire gomi の
		// seen_gomi_hayai）を見た人だけ、キリコが重ねる。朝は火・金の一枚と、きょうが火ようのこと
		// （9/14 は火よう。朝の一言は全員に出す＝フラグは読まない）
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
					if (s.flag("seen_gomi_hayai"))
						await s.say("kiriko", "（……すみれの　あの\nふくろンゴ）");
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
		// うちの郵便受け。ピザやのチラシの段（夕: 『よる11時まで』→ 宵: 買っていない人は
		// 『よる11時まで』→まだまにあう（seen_pizza_yoru）／買った人は晩ごはんのあと →
		// 深夜: seen_pizza_yoru でまだ買っていない人は「けっきょく、たのまなかった」→ あしたの晩ごはん。
		// ぬいてポケットへ＝got_pizza_chirashi。room desk の朝が「きょうの晩ごはん」で読む＝㊻）。
		// 朝は朝刊（ナイターの結果。P0-2）
		{
			id: "mybox",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					// 晩ごはんを買っていない人には、夕方の『よる11時まで』がまだ生きている
					// （seen_pizza_yoru＝深夜の「けっきょく、たのまなかった」が読む）
					if (!hasDinner(s)) {
						s.set("seen_pizza_yoru");
						await s.narrate("ピザやの　チラシ。\n『よる11時まで』");
						await s.say("kiriko", "（……まだ、まにあうンゴ）");
						return;
					}
					await s.narrate("ピザやの　チラシ。");
					await s.say("kiriko", "（……晩ごはんは、\nもう　すんだンゴ）");
					return;
				}
				if (t === "shinya") {
					// ㊻ 一度ぬいたら、ポケットの中（郵便受けにはもう無い）
					if (s.flag("got_pizza_chirashi")) {
						await s.narrate("チラシは、もう\nポケットの　中だ。");
						return;
					}
					await s.narrate("チラシの『よる11時まで』。");
					// 宵に「まだ、まにあう」と言って、そのまま買わなかった人だけ
					if (s.flag("seen_pizza_yoru") && !hasDinner(s))
						await s.say("kiriko", "（……けっきょく、\nたのまなかったンゴ）");
					await s.say("kiriko", "（……あしたの　晩ごはん、\nこれに　するンゴ）");
					s.set("got_pizza_chirashi");
					await s.narrate("チラシを、ぬいて\nポケットに　しまった。");
					return;
				}
				if (t === "asa") {
					await s.narrate("うちの郵便受けに、\n朝刊が　ささっている。");
					// ゆうべのナイターの結果（nostalgia.md P0-2。数字を言い切るのはここ1か所だけ）。
					// スポーツらんは、ゆうべのナイターを見た／聞いた人にだけ
					// （P0-11・§5: フラグの無い人の朝は現行と同一。前ぶりの無い人に結果だけを見せない）。
					// 部屋のテレビで見た人（room tv）は「ねてて正解」、テレビは見ずに 502 のドアごしに
					// 実況を聞いた人（d502 の seen_502_yakiu）は、となりの人の夜と重ねる
					if (numFlag(s, "seen_tv_yoru") > 0 || s.flag("seen_chukei_end")) {
						await s.narrate("スポーツらん。延長12回、\nひきわけ、だった。");
						await s.say("kiriko", "……ねてて　正解ンゴ");
						return;
					}
					if (s.flag("seen_502_yakiu")) {
						await s.narrate("スポーツらん。延長12回、\nひきわけ、だった。");
						await s.say("kiriko", "（502の　人、さいごまで\n見たンゴかね）");
					}
					return;
				}
				await s.narrate("うちの郵便受け。ピザやの\nチラシ。『よる11時まで』");
			},
		},
		// となりの郵便受け。不在票の段（夕: 不在票 seen_fuzai → 宵: とりこまれている →
		// 深夜: ドアの前にまだ何も出ていない → 朝: ドアの前にたたんだダンボール）。
		// 宵・深夜は人を出さず、物の変化だけ。
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
					// 夕方の不在票を見た人には、まだ何も出ていないドア（朝のダンボール＝出し物への前ぶり。
					// 不在票の答えは、朝のたたんだダンボール（ゆうべのうちに受け取れた）だけ。
					// street post_ev の朝のバイクは、アパートの前をとおりすぎる）
					await s.narrate(
						fuzai
							? "となりの　ドアの前は、\nまだ　なにも　ない。"
							: "となりの　郵便受け。\nチラシが　一枚。",
					);
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
				// どちらの枝も、ひざを　たたく音（502 の人のくせ）で しめる。
				// 実況を聞いた人は seen_502_yakiu（mybox の朝のスポーツらん「502の人も」が読む）
				if (t === "yoru") {
					const end = !!s.flag("seen_chukei_end");
					if (!end) s.set("seen_502_yakiu");
					await s.narrate(
						end
							? "502ごう室。ドアごしに、\nチャンネルを　かえる　音が　つづく。"
							: "502ごう室。ドアごしに、\nナイターの　実況。",
					);
					await s.narrate("ときどき、ぽんと\nひざを　たたく音。");
					return;
				}
				await s.narrate("502ごう室。テレビの音が\nもれている。");
			},
		},
		// 503 は、キリコよりあとに越してきた人（夕方に一度だけ seen_503。2回目は表札のまわりの
		// テープのあと）。宵はシャワーの音（seen_503_yoru）、深夜はしずか（他人の部屋の灯りは出さない。
		// 宵のシャワーを聞いた人には、ふろばの換気扇の音だけ＝不在の説明でなく機械の音の痕跡）、朝はめざまし。
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
					await s.narrate(
						s.flag("seen_503_yoru")
							? "503ごう室。ふろばの　換気扇の\n音だけ、かすかに　している。"
							: "503ごう室。\nしずかだ。",
					);
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
					s.set("seen_503_yoru");
					await s.narrate("503ごう室。ドアの　むこうで、\nシャワーの　音。");
					return;
				}
				await s.narrate("503ごう室。ひょうさつが\nあたらしい。");
				if (!s.flag("seen_503")) {
					s.set("seen_503");
					await s.say("kiriko", "（吾輩より、あとに\n来た人ンゴ）");
					return;
				}
				// 2回目は、前の人の表札をはがしたあと（だれが住んでいたかは言わない）
				await s.narrate("ひょうさつの　まわりに、\n四角い　テープのあと。");
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
		// 502 の牛乳箱。あき瓶の段（人は出さない。夕: からっぽ → 宵: あらったあき瓶がふたの上に →
		// 深夜: あき瓶に蛍光灯 → 朝: あたらしい牛乳に かわっている）。あき瓶（宵・深夜）を見た人だけ
		// seen_gyunyu_bako（夕方のからっぽだけの人には、朝の「あき瓶が」は前振りの無い回収になる）。
		// 見ていない人・夕方だけの人の朝は、一本入っているだけ（からっぽの箱が埋まった、で通じる）。
		// 朝、夕方に street の店主から あんぱんを買って「ぎゅうにゅうは　あるかい」と聞かれ、宵に牛乳を
		// 買わなかった人（got_dinner_pan で got_gyunyu の無い人＝street arrive_yoru の「なかったンゴ」）にだけ、
		// キリコがひとこと
		{
			id: "milk",
			x: 5,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("502の前に、牛乳箱。");
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate(
						s.flag("seen_gyunyu_bako")
							? "あき瓶が、あたらしい\n牛乳に　かわっている。"
							: "あたらしい牛乳が、\n一本入っている。",
					);
					if (s.flag("got_dinner_pan") && !s.flag("got_gyunyu"))
						await s.say("kiriko", "（……ゆうべ、これが\nほしかったンゴ）");
					return;
				}
				// 宵・深夜の文に「からっぽ」を出さない（nostalgia.md P0-1 の受け入れ条件・罠4）
				if (t === "yoru") {
					s.set("seen_gyunyu_bako");
					await s.narrate("ふたの上に、あらった\nあき瓶が　一本。");
					return;
				}
				if (t === "shinya") {
					s.set("seen_gyunyu_bako");
					await s.narrate("あき瓶に、蛍光灯が\nうつっている。");
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
		// 見た人と、うみの車どめ・行きどまり・きょり標の3つで「道も、川も、線路も　おしまい」に
		// なった人（umi の seen_umi_hashikko）だけ、キリコが町を重ねる
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
				if (
					s.flag("tod") === "asa" &&
					(s.flag("seen_kyori_0") || s.flag("seen_umi_hashikko"))
				)
					await s.say("kiriko", "（ここが　かわらで……\nはしっこが、うみンゴ）");
			},
		},
		// かいだんの窓。見えるものを「土手の街灯の列」にしぼった段（夕: 土手まであかね色 →
		// 宵: 街灯もついている → 深夜: 街灯だけが ならんでいる＝seen_winst_shinya → 朝: もうついていない）。
		// 深夜、かわらの土手のしゃめんに すわった人（kawara fumiato の seen_suwari_kawara）、
		// それが無くて川ごしにこちらを見た人（kawara taigan_view の seen_taigan_shinya）には、
		// キリコが あちらとこちらを重ねる。どちらも無い人は2行で終わる（窓が見えたとは言わない）
		{
			id: "win_st",
			x: 11,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					s.set("seen_winst_shinya");
					await s.narrate(
						"かいだんの窓。まちの明かりが\nほとんど　きえている。",
					);
					await s.narrate("土手の　街灯だけが、\nならんでいる。");
					if (s.flag("seen_suwari_kawara")) {
						await s.say("kiriko", "（……あの　へんに、\nすわってたンゴ）");
						return;
					}
					if (s.flag("seen_taigan_shinya"))
						await s.say("kiriko", "（……さっきは、\nあっちに　いたンゴ）");
					return;
				}
				if (t === "asa") {
					await s.narrate("あさの光が、かいだんに\nさしこんでいる。");
					// 深夜に街灯の列を見た人だけ（見ていない人は1行で終わる）
					if (s.flag("seen_winst_shinya"))
						await s.narrate("土手の　街灯は、\nもう　ついていない。");
					return;
				}
				// 宵は灯りだけ（夕やけの文に落とさない。消えた・からっぽは書かない。nostalgia.md P0-1）
				if (t === "yoru") {
					await s.narrate(
						"かいだんの窓から、まちの灯り。\n土手の　街灯も、ついている。",
					);
					return;
				}
				await s.narrate(
					"かいだんの窓から、夕やけ。\n土手の　ほうまで、あかね色だ。",
				);
			},
		},
	],
};
