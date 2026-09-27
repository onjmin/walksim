// アパートの廊下（キリコの階）。DESIGN §4・docs/content-briefs.md「日常レイヤー」・
// docs/style-everyday.md。12×8・室内（outdoor なし）・BGM null。
// 徹底して普通に作る。時間帯の差分は生活の痕跡だけ：
//   夕方 … どこかの部屋のテレビの音・となりの不在票（ぜんぶ日常）
//   宵   … せんたくきの音・502 からナイターの実況・階段の窓にまちの灯り
//           （docs/nostalgia.md P0-1・P0-2。人は出さない。延長の段は数えない＝どの回でも「実況」だけ）
//   深夜 … 違和感は「蛍光灯の明滅」ただ一つ（style-everyday §5: apart は微差1個まで）
//   朝   … 不在票が取り込まれている・牛乳が届いている・朝刊のスポーツらん（生活が続いている payoff）
//
// 座標凍結v2: キリコの部屋のドア (2,2)→room(5,8)／room からの戻り (2,3)／
// 階段 (10,6)→street(2,10)／street からの戻り (10,5)。
// 夕方だけ、部屋に入る前に「もう帰る？」の確認を挟む（時間を送る操作に意味を持たせる。
// style-everyday §1。晩ごはん未購入ならひとことだけ添える）。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { warp } from "../helpers";
import { numFlag, yoruAkubi } from "../nostalgia";
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
	outside: "#14120e",
	tiles,
	rows,
	// ジオラマ表示の差し色の源（?classic の屋内では使わない）
	lights: [{ x: 5, y: 4, r: 2, color: "#b8cce0" }], // 蛍光灯
	events: [
		// ── 着いたとき（夕方: 生活音／宵: せんたくき／深夜: 蛍光灯の明滅。どれも一度だけ） ──
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
				await s.narrate("さかなを　やく においも、\nすこし。");
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
		{
			id: "keiko_shinya",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(500);
				s.se("hum", { volume: 0.6 });
				await s.fadeOut(90);
				await s.fadeIn(90);
				await s.wait(250);
				await s.fadeOut(70);
				await s.fadeIn(70);
				await s.narrate("蛍光灯が、二回\nまばたきをした。");
				await s.say("kiriko", "……きれかけンゴ");
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
				if (s.flag("tod") === "yu") {
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

		// ── しらべられるもの（ノルマ12個。違和感は蛍光灯だけに集める） ──
		{
			id: "fluor",
			x: 5,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("見あげると、蛍光灯。");
					await s.narrate("……ちら、ちら、と\nまたたいている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("蛍光灯は、もう\nまたたいていない。");
					return;
				}
				await s.narrate("見あげると、蛍光灯。\nしろい、ふつうの光だ。");
			},
		},
		{
			id: "keiji",
			x: 6,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべの掲示。");
				await s.narrate("『もえるゴミは　火・金』");
				await s.narrate("『夜に出すのは\nやめましょう』");
			},
		},
		{
			id: "mybox",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("うちの郵便受け。\nチラシは、そのままだ。");
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
				await s.narrate("うちの郵便受け。ピザやの\nチラシが　二枚。");
			},
		},
		{
			id: "nbox",
			x: 4,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("となりの　不在票は、\nそのままだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("不在票が、\nなくなっている。");
					await s.say("kiriko", "……うけとれたンゴね");
					return;
				}
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
					await s.narrate("502ごう室。みそしるの\nにおいがする。");
					return;
				}
				// 宵は、部屋のテレビと同じナイター（nostalgia.md P0-2。延長の段には関係なく「実況」だけ）
				if (t === "yoru") {
					await s.narrate("502ごう室。ドアごしに、\nナイターの　実況。");
					await s.narrate("ときどき、ぽんと\nひざを　たたく音。");
					return;
				}
				await s.narrate("502ごう室。テレビの音が\nもれている。");
			},
		},
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
					await s.say("kiriko", "……おきないンゴか");
					return;
				}
				await s.narrate("503ごう室。ひょうさつが\nあたらしい。");
			},
		},
		{
			id: "kasa",
			x: 1,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("かさ立て。\n三本の　ままだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("かさ立てのかさが、\n二本に　へっている。");
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
		// 二度目で変わるもの（げんかんマット）
		{
			id: "mat",
			x: 2,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_mat")) {
					s.set("seen_mat");
					await s.narrate("うちの　げんかんマット。\nすこし、よれている。");
					return;
				}
				await s.narrate("マットを、まっすぐに\nなおした。……よし。");
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
		{
			id: "shimi",
			x: 8,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("てんじょうに、しみ。\nなにかの地図みたいな形だ。");
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
