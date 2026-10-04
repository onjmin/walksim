// ノスタルジー層の共通部品（docs/nostalgia.md §3「共通の新ファイル」）。データ層のヘルパーで、エンジンではない。
// 宵（yoru）＝時間が流れる夜：地区に着くたびに町の時計が数分ずつ進む（yoruStep）。
// 深夜（shinya）＝時間が止まった夜：時計は 2:00 のまま、手の中の缶だけが冷めていく（got_kan）。
// 日記は、宵に一行・深夜にポエム・朝に自分で消す（NIKKI・POEM）。エンディングのまとめにも一行のる。
//
// ノスタルジー層の約束（nostalgia.md §0・§2.2・§5。レビューはこれで落とす）:
// - s.note() は呼ばない。深夜に人・人の声を出さない（NPC 0体）。夕方に不穏・怪異を足さない
// - 新しいチップ・BGM は使わない。SE は data/sfx.ts にある名前だけ（このファイルが鳴らすのは item だけ）
// - 文は全角22字×2行・選択肢14字。感情語（なつかしい・エモい・さみしい 等）・「だから」「つまり」・説明は書かない
// - 数・文字のフラグは、必ずこのファイルの読み手（numFlag・kanLv・nikkiYoru・nikkiPoem）で読む。
//   validate は全フラグを true にしても走るので、typeof で見ないと true が紛れこむ
//   （ここでは true を「数なら 1」「文字なら既定のキー」とみなす）
// - once の done:<map>:<id> は run が終わってから立つ（engine/game.ts の runEvent）。
//   arrive_yoru の中では、いま着いた地区はまだ yoruStep に数えられていない（yoruAkubi はそれを足して数える）
//
// ── フラグの約束（P0）。型: 真＝s.set(name) の true／数＝number／字＝string。立て＝set する所・読み＝読む所 ──
// （ファイル名は src/data/maps/ の略。nostalgia.ts はこのファイル。すべて seen_／got_ 接頭辞＝FLAG_OK に収まる）
// got_kan            数0〜4 立て: nostalgia.ts だけ（kanShinya=1・kanTick/kanLine=+1・kanDesk=4。マップから直に set しない）  読み: kanLv/kanHeld 経由（自販機5台・6地区 onEnter・座る3か所・room desk・poemKey）
// got_gyunyu         真     立て: street conbini_door（yoru・＞＞1 牛乳を買う）                          読み: street conbini_door（yoru の2回目）・gyunyuBoke（tenshuAsa の牛乳の1往復と、延長の1往復の抑止）・nikkiKey
// got_fukubikiken    真     立て: tonarimachi taiyaki_obachan（たいやきを買った直後）                   読み: tonarimachi fukubiki（キリコの一言の差しかえ）・room bed（asa）
// seen_fukubiki      真     立て: tonarimachi fukubiki（調べるたび）                                    読み: 同じ（券を持っての二度目は「まだ　もどらない」）
// seen_makura_asa    真     立て: room bed（asa。かゆみ・福引券のどちらかを出したとき）                 読み: 同じ（2回目からは「ふとんを、なおした。」だけ）
// seen_akubi         真     立て: nostalgia.ts yoruAkubi（7か所の arrive_yoru の末尾から呼ぶ）          読み: yoruAkubi
// seen_yoru_sasoi    真     立て: room window（yoru の末尾・一度だけ外への誘い）                        読み: room window
// seen_tv_yoru       数     立て: room tv（yu/yoru。chukeiDan を読んだあとで +1。seen_tv の +1 も残す）  読み: chukeiDan（room tv）・apart mybox（asa）
// seen_chukei_end    真     立て: room tv（chukeiDan が 3 の最初の1回＝中継の打ち切り）                 読み: room tv・room pc（yoru）・kokudo gs_window（yoru）・apart mybox（asa）・street tenshuAsa（2回目）・nikkiKey
// seen_tenki         真     立て: room tv（打ち切りの次の1回＝天気予報）                                読み: room tv（以降は自分で消す）
// seen_tenshu_asa2   真     立て: street tenshuAsa（2回目・延長の1往復。牛乳の1往復を出した人には出さない） 読み: street tenshuAsa
// seen_nikki_yoru    字     立て: room diary（yoru の初回に nikkiKey(s) のキー）                         読み: nikkiYoru 経由（room diary の yoru2回目・shinya・asa）・nikkiSummary
// seen_nikki_shinya  字     立て: room diary（shinya。shinyaWalked(s) かつ未設定なら poemKey(s) のキー） 読み: nikkiPoem 経由（room diary の shinya2回目・asa）（まとめカードには載せない。nikkiSummary は seen_nikki_kesu だけを見る）
// seen_nikki_kesu    真     立て: room diary（asa。ポエムを消しゴムで消したとき）                       読み: room diary（asa）・nikkiSummary
// seen_nikki_asa     真     立て: room diary（asa。ポエムが無く、ゆうべの一行を読み返したとき）         読み: 同じ（読み返しは一度だけ）
// seen_receipt       真     立て: room desk（asa。レシートが出てきたとき）                              読み: 同じ（レシートは一度だけ）
// seen_ka            真     立て: kawara ka_a/ka_b/ka_c（touch・yu・一日一回）                          読み: 蚊の帯の when・room bed（yoru・asa）・nikkiKey
// seen_kairan_sign   真     立て: danchi kairanban（yu・＞＞1 サインする を選んだときだけ）              読み: danchi kairanban（yu・yoru の書いたあと・asa）・nikkiKey
// seen_piano_yu      真     立て: sumire yamada_door（yu と yoru）                                      読み: sumire yamada_door（asa の「こえた」）
// seen_kichi_shinya  真     立て: sumire kichi_board_24/25（shinya・しゃがんだ）                        読み: 同じ（2回目は短い1行）
// seen_danchi_ue     真     立て: danchi a_stairs（shinya・いちばん上まで）                             読み: 同じ（2回目は短い1行）・poemKey
// seen_suwari_kawara 真     立て: kawara fumiato（shinya・すわる）                                      読み: 同じ（2回目は短い1行）
// seen_taigan_shinya 真     立て: kawara taigan_view（shinya・末尾の3行を一度だけ）                     読み: 同じ
// seen_denki_bill    真     立て: street denki_bill（初回・キリコの駄菓子屋のボケ）                     読み: 同じ（二度目で下の紙）
// seen_board_st      真     立て: street board_ev（初回）                                               読み: 同じ（二度目で去年の紙）
// seen_gate_plate    真     立て: sumire gate_plate（初回）                                             読み: 同じ（二度目で『70』）
// seen_tenant        真     立て: tonarimachi tenant（初回）                                            読み: 同じ（二度目で看板の跡）
// seen_annaizu2      真     立て: danchi annaizu（初回）                                                読み: 同じ（二度目で D棟の点線）
// seen_urichi2       真     立て: ekimae urichi（初回）                                                 読み: 同じ（二度目で完成予想図）
// ── 既存のフラグ（ノスタルジー層は読むだけ。立て方は変えない） ──
// done:<map>:arrive_yoru  真 立て: エンジン（新設の arrive_yoru。6地区＋apart）   読み: yoruStep/yoruStepSt（6地区だけ数える）・yoruAkubi
// done:<map>:arrive_yu    真 立て: エンジン（既存の arrive_yu）                   読み: room bed（yoru の就寝。遠い音。arrived(s, map, "yu")）
// done:<map>:arrive_shinya 真 立て: エンジン（既存の arrive_shinya）              読み: shinyaWalked（room diary の shinya）
// seen_tv                 数 立て: room tv（そのまま +1。NNN の条件）            読み: room tv（NNN。変えない）
// seen_tenshu_asa         真 立て: street tenshuAsa（1回目）                      読み: street tenshuAsa
// seen_tenshu2            真 立て: street tenshu（yu の2回目・カーテンの話）      読み: street my_win（asa は、これがある人にだけ出る＝when）
// got_dinner_onigiri/pan  真 立て: street offerDinner                            読み: nikkiKey・street tenshuAsa・room（既存）
// got_korokke/seen_kaikei 真 立て: suupaa korokke／baachan_ev（会計）            読み: nikkiKey・suupaa baachan_ev（レシートの1行）・room desk（asa のレシート）
// got_taiyaki             真 立て: tonarimachi taiyaki_obachan                   読み: nikkiKey
// seen_kairan_danchi      真 立て: danchi kairan_hito                            読み: danchi kairanban（サインの選択肢の条件）

import type { GameState, Story } from "../engine/defs";

// ───────────────── フラグの読み手 ─────────────────

/** 数のフラグ（未設定は 0、true は 1）。例: `numFlag(s, "seen_tv_yoru")`。 */
export const numFlag = (s: Story, name: string): number => {
	const v = s.flag(name);
	return typeof v === "number" ? v : v ? 1 : 0;
};

/** 文字のフラグ（文字でなければ null。true も null）。 */
export const strFlag = (s: Story, name: string): string | null => {
	const v = s.flag(name);
	return typeof v === "string" ? v : null;
};

// ───────────────── 宵の段（P0-1） ─────────────────

/**
 * 日常の屋外の地区（宵の段・深夜に歩いたか を数える地区。apart・room は入らない）。
 * 2026-09-28 地続きの拡張で、やまみち・せんろぞいのみち・うみべ・みどりがおか公園を足して10地区。
 */
export const OUTDOOR_DAILY: readonly string[] = [
	"street",
	"sumire",
	"kawara",
	"danchi",
	"kokudo",
	"ekimae",
	"yamamichi",
	"senro",
	"umi",
	"koen",
];

type Tod = "yu" | "yoru" | "shinya" | "asa";

/** その地区の arrive_<tod>（once）がもう済んだか。例: `arrived(s, "kawara", "yu")`（P0-3 の遠い音）。 */
export const arrived = (s: Story, mapId: string, tod: Tod): boolean =>
	!!s.flag(`done:${mapId}:arrive_${tod}`);

/** 宵に着いた屋外の地区の数（0〜6）。arrive_yoru の once で数えるので、往復しても増えない。 */
export const yoruStep = (s: Story): number =>
	OUTDOOR_DAILY.filter((m) => arrived(s, m, "yoru")).length;

/** yoruStep の GameState 版（P1-1 の lights.when 用。`when: (st) => yoruStepSt(st) < 3` など）。 */
export const yoruStepSt = (st: GameState): number =>
	OUTDOOR_DAILY.filter((m) => !!st.flags[`done:${m}:arrive_yoru`]).length;

/**
 * 宵の町の時計（"20:05"〜"21:15"。yoruStep ごとに7分進む）。off は時計ごとのずれ（ekimae tokei は 1）。
 * 例: `` s.narrate(`まちの時計。――${yoruClock(s)}。`) ``。
 */
export const yoruClock = (s: Story, off = 0): string => {
	// 地区がふえて 60 分をこえるので、時もくり上げる（10地区で 21:15 まで）
	const m = 20 * 60 + 5 + 7 * yoruStep(s) + off;
	return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};

/**
 * あくび（宵の4地区目あたり。一度だけ `seen_akubi`）。7か所の arrive_yoru の末尾で `await yoruAkubi(s)`。
 * いま着いた地区は done: がまだ立っていないので、1つ足して数える（4地区目に着いたところで出る）。
 */
export const yoruAkubi = async (s: Story): Promise<void> => {
	if (s.flag("seen_akubi")) return;
	const here = s.state.mapId;
	const now = OUTDOOR_DAILY.includes(here) && !arrived(s, here, "yoru") ? 1 : 0;
	if (yoruStep(s) + now < 4) return;
	s.set("seen_akubi");
	await s.say("kiriko", "……ふあ。\nあくびが　でたンゴ");
};

// ───────────────── ナイター延長戦（P0-2） ─────────────────

/**
 * 部屋のテレビの段（0〜3）＝ max(yoruStep, 宵にテレビを見た回数)。
 * 0 9回うら／1 延長10回／2 延長11回／3 打ち切り（seen_chukei_end）→ 天気予報（seen_tenki）→ 自分で消す。
 * room tv は、これを読んでから `s.set("seen_tv_yoru", numFlag(s, "seen_tv_yoru") + 1)` する
 * （テレビだけでも4回目で打ち切り、3地区を回った人は1回目で打ち切り）。
 */
export const chukeiDan = (s: Story): number =>
	Math.min(3, Math.max(yoruStep(s), numFlag(s, "seen_tv_yoru")));

// ───────────────── 『あったか～い』の缶（P0-6） ─────────────────
// got_kan: 0 もっていない／1 あつい／2 ちょうどいい／3 ぬるい／4 のみほした（一晩に一本。お金の概念は無い）。
// 書くのはこのファイルだけ。歩くだけでは3で止まり、4へは座る（kanLine）か机（kanDesk）で進む。

/** 自販機の再調べで出す、いまの温度（1〜3）。 */
const KAN_ONDO = [
	"",
	"缶が、まだ　あつい。\nそでで　もちかえた。",
	"缶は、てのひらに\nちょうどいい。",
	"缶は、ぬるくなっていた。",
];
// 「……」は付けない（座る場所の締めのキリコ「……よし」「……あれ」と重なって、1か所に二つ並ぶため。§5）
const KAN_NOMIHOSHI = "もう、つめたい。\nのこりを　のみほした。";

/** 缶の段（0〜4）。`got_kan` が true（validate の全立て）なら 1。 */
export const kanLv = (s: Story): number =>
	Math.max(0, Math.min(4, numFlag(s, "got_kan")));

/** 缶を手に持っているか（1〜3）。座る場所で「缶があれば缶の1行に替える」の判定に使う。 */
export const kanHeld = (s: Story): boolean => {
	const lv = kanLv(s);
	return lv >= 1 && lv <= 3;
};

/**
 * 深夜の灯っている自販機（shinya 分岐の末尾で `await kanShinya(s)`）。
 * 0 なら「＞＞1 ひとつ買う」→ item SE → got_kan=1。1〜3 なら いまの温度を1行（進めない）。4 なら何もしない。
 * 呼ぶ所: street vending_ev・sumire vending・danchi vending_ev・kokudo vending_ev・ekimae jihanki（kokudo 北の(30,6)は対象外）。
 */
export const kanShinya = async (s: Story): Promise<void> => {
	const lv = kanLv(s);
	if (lv >= 4) return;
	if (lv >= 1) {
		await s.narrate(KAN_ONDO[lv]);
		return;
	}
	const i = await s.choose(["＞＞1 ひとつ買う", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.se("item", { volume: 0.5 });
	s.set("got_kan", 1);
	await s.narrate("がこん。\nてのひらが、あつい。");
};

/**
 * 地区を移るたびに缶が冷める（同期・文は出さない）。6地区の onEnter に `kanTick(s);` を1行。
 * tod が shinya で 1〜2 のときだけ +1（歩くだけでは3で止まる）。
 */
export const kanTick = (s: Story): void => {
	if (s.flag("tod") !== "shinya") return;
	const lv = kanLv(s);
	if (lv === 1 || lv === 2) s.set("got_kan", lv + 1);
};

/**
 * 座ったとき用（shinya。`if (kanHeld(s)) await kanLine(s);`）。いまの温度を1行出して +1。
 * 3 からは飲み干して 4。持っていなければ何もしない。
 * 呼ぶ所: sumire kichi_board_24/25・danchi a_stairs（いちばん上）・kawara fumiato（すわる）。
 */
export const kanLine = async (s: Story): Promise<void> => {
	const lv = kanLv(s);
	if (lv < 1 || lv > 3) return;
	if (lv === 3) {
		s.set("got_kan", 4);
		await s.narrate(KAN_NOMIHOSHI);
		return;
	}
	s.set("got_kan", lv + 1);
	await s.narrate(KAN_ONDO[lv]);
};

/**
 * 部屋の机（room desk の shinya 分岐の末尾で `await kanDesk(s)`）。1〜3 なら机で飲み干して 4。
 * 「ぬるく」と言うのは 3 のときだけ（地区を移らずに帰ってくると、まだ 1〜2 のまま）。
 */
export const kanDesk = async (s: Story): Promise<void> => {
	if (!kanHeld(s)) return;
	const lv = kanLv(s);
	s.set("got_kan", 4);
	await s.narrate(
		lv === 3
			? "ぬるくなった　缶を、\n机で　のみほした。"
			: "缶を、机で\nゆっくり　のみほした。",
	);
};

// ───────────────── 一行日記（P0-4） ─────────────────

/** 宵の一行のキー（`seen_nikki_yoru` に文字で入れる）。 */
export type NikkiKey =
	| "taiyaki"
	| "korokke"
	| "kairan"
	| "ka"
	| "chukei"
	| "onigiri"
	| "pan"
	| "gyunyu"
	| "nashi";

/** 宵の一行（全部は書かない。nikkiKey が一つだけ選ぶ）。 */
export const NIKKI: Record<NikkiKey, string> = {
	taiyaki: "『たいやき。しっぽまで\nあんこ』",
	korokke: "『コロッケ　半額。\nはしっこ　おまけ』",
	kairan: "『回覧板に、サイン。\nこども　あつかい』",
	ka: "『かわらで、蚊に\nさされた』",
	chukei: "『やきう、延長。\nさいごまで　見られず』",
	onigiri: "『晩ごはん、おにぎり。\n鮭だった』",
	pan: "『晩ごはん、あんぱん。\n牛乳は　なかった』",
	gyunyu: "『あんぱんと、牛乳。\n牛乳は　コンビニの』",
	nashi: "『きょうも、とくに\nなし』",
};

/** 深夜のポエムのキー（`seen_nikki_shinya` に文字で入れる）。 */
export type PoemKey = "kan" | "ue" | "machi";

/** 深夜のポエム（朝に消す前提の、少しダサい文）。 */
export const POEM: Record<PoemKey, string> = {
	kan: "『2時の　じはんきは、\n町の　心臓だった』",
	ue: "『町の灯りを　かぞえた。\n吾輩も、そのひとつ』",
	machi: "『夜の町は、吾輩だけの\nものだった』",
};

/** まとめカードの見出し（street endingAtKakoi の sections の先頭に `{ title: NIKKI_TITLE, lines: nikkiSummary(s) }`）。 */
export const NIKKI_TITLE = "きのうの　にっき";

/**
 * 宵に書く一行を選ぶ（優先順で一つだけ）。
 * got_taiyaki > got_korokke > seen_kairan_sign > seen_ka > seen_chukei_end > got_dinner_onigiri >
 * got_dinner_pan（got_gyunyu なら gyunyu）> nashi。room diary が `s.set("seen_nikki_yoru", nikkiKey(s))` する。
 */
export const nikkiKey = (s: Story): NikkiKey => {
	if (s.flag("got_taiyaki")) return "taiyaki";
	if (s.flag("got_korokke")) return "korokke";
	if (s.flag("seen_kairan_sign")) return "kairan";
	if (s.flag("seen_ka")) return "ka";
	if (s.flag("seen_chukei_end")) return "chukei";
	if (s.flag("got_dinner_onigiri")) return "onigiri";
	if (s.flag("got_dinner_pan")) return s.flag("got_gyunyu") ? "gyunyu" : "pan";
	return "nashi";
};

/** 深夜のポエムを選ぶ（got_kan > seen_danchi_ue > machi）。room diary が `s.set("seen_nikki_shinya", poemKey(s))` する。 */
export const poemKey = (s: Story): PoemKey =>
	kanLv(s) > 0 ? "kan" : s.flag("seen_danchi_ue") ? "ue" : "machi";

/** 深夜の町を歩いたか（6地区のどれかの arrive_shinya が済んでいる）。ポエムを書く条件。 */
export const shinyaWalked = (s: Story): boolean =>
	OUTDOOR_DAILY.some((m) => arrived(s, m, "shinya"));

/** 宵に書いた一行（NIKKI の本文）。書いていなければ null。キーが true なら既定の nashi。 */
export const nikkiYoru = (s: Story): string | null => {
	const v = s.flag("seen_nikki_yoru");
	if (!v) return null;
	return typeof v === "string" && Object.hasOwn(NIKKI, v)
		? NIKKI[v as NikkiKey]
		: NIKKI.nashi;
};

/** 深夜に書いたポエム（POEM の本文）。書いていなければ null。キーが true なら既定の machi。 */
export const nikkiPoem = (s: Story): string | null => {
	const v = s.flag("seen_nikki_shinya");
	if (!v) return null;
	return typeof v === "string" && Object.hasOwn(POEM, v)
		? POEM[v as PoemKey]
		: POEM.machi;
};

/** 日記の本文を、まとめカードの1行にする（『』と改行をとる）。 */
const summaryLine = (text: string): string => text.replace(/[『』\n]/g, "");

/**
 * まとめカード「きのうの　にっき」の行（1〜2行・数字は出さない）。
 * 宵の一行 ＋（ポエムを消していれば「（けしゴムの　あと）」）。何も無ければ「まっさらの　まま」。
 * 消していないポエムは載せない（朝に消す前提の文を、最後の記録として額に入れない。
 * ポエムは深夜の「つぎの　ページ」なので、きのうのページには入らない）。
 */
export const nikkiSummary = (s: Story): string[] => {
	const lines: string[] = [];
	const yoru = nikkiYoru(s);
	if (yoru) lines.push(summaryLine(yoru));
	if (s.flag("seen_nikki_kesu")) lines.push("（けしゴムの　あと）");
	return lines.length ? lines : ["まっさらの　まま"];
};
