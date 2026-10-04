// ノスタルジー層の共通部品（docs/nostalgia.md §3「共通の新ファイル」）。データ層のヘルパーで、エンジンではない。
// 宵（yoru）＝時間が流れる夜：地区に着くたびに町の時計が数分ずつ進む（yoruStep）。
// 深夜（shinya）＝町の時計は地区を回るたびに進む（shinyaClock）。部屋のかべの時計だけ電池ぎれで 2:00。手の中の缶が冷めていく（got_kan）。
// 朝（asa）＝窓の場面のあと、町は 7時ごろ。地区に着くたびに数分ずつ進む（asaClock）。
// 日記は、宵に一行・深夜にポエム・朝に自分で消す（NIKKI・POEM）。エンディングのまとめにも一行のる。
//
// ノスタルジー層の約束（nostalgia.md §0・§2.2・§5。レビューはこれで落とす）:
// - s.note() は呼ばない。深夜に人・人の声を出さない（NPC 0体）。夕方に不穏・怪異を足さない
// - 宵は人の姿を書かない（声・物音・におい・点いた灯りは可）。深夜は人も人の声も出さない
//   （物の変化・灯り・機械の音まで。新聞配達・夜勤の店員・ひとつだけ灯る他人の窓も不可）
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
// got_gyunyu         真     立て: street conbini_door（yoru・＞＞1 牛乳を買う）                          読み: street conbini_door（yoru の2回目）・gyunyuBoke（tenshuAsa の牛乳の1往復と、延長の1往復の抑止）・nikkiKey・apart milk（asa）
// got_fukubikiken    真     立て: tonarimachi taiyaki_obachan（たいやきを買った直後）                   読み: tonarimachi fukubiki（キリコの一言の差しかえ）・room bed（asa）
// seen_fukubiki      真     立て: tonarimachi fukubiki（調べるたび）                                    読み: 同じ（券を持っての二度目は「まだ　もどらない」）
// seen_makura_asa    真     立て: room bed（asa。かゆみ・福引券のどちらかを出したとき）                 読み: 同じ（2回目からは「ふとんを、なおした。」だけ）
// seen_akubi         真     立て: nostalgia.ts yoruAkubi（7か所の arrive_yoru の末尾から呼ぶ）          読み: yoruAkubi
// seen_yoru_sasoi    真     立て: room window（yoru の末尾・一度だけ外への誘い）                        読み: street arrive_yoru（room window の回収は消えた）
// seen_sasoi_kaeri   真     立て: street arrive_yoru（seen_yoru_sasoi の人に一度）                      読み: 同じ（一度だけ）
// seen_tv_yoru       数     立て: room tv（yu/yoru。chukeiDan を読んだあとで +1）                        読み: chukeiDan（room tv）・apart mybox（asa）
// seen_chukei_end    真     立て: room tv（chukeiDan が 3 の最初の1回＝中継の打ち切り）                 読み: room tv・room pc（yoru）・kokudo gs_window（yoru）・apart mybox（asa）・street tenshuAsa（2回目）・nikkiKey・apart d502（yoru）・street denki_tv/h2_door（yoru）・danchi b_win_tv（yoru・asa）・umi koya_door（yoru）・room window（yoru）・sumire kondo_win（yoru）
// seen_tenki         真     立て: room tv（打ち切りの次の1回＝天気予報）                                読み: room tv（以降は自分で消す）・apart kasa（asa）・umi fune_b（asa）・danchi taiso_kanban（yoru）
// seen_tenshu_asa2   真     立て: street tenshuAsa（2回目・延長の1往復。牛乳の1往復を出した人には出さない） 読み: street tenshuAsa
// seen_nikki_yoru    字     立て: room diary（yoru の初回に nikkiKey(s) のキー）                         読み: nikkiYoru 経由（room diary の yoru2回目・shinya・asa）・nikkiSummary
// seen_nikki_shinya  字     立て: room diary（shinya。shinyaWalked(s) かつ未設定なら poemKey(s) のキー） 読み: nikkiPoem 経由（room diary の shinya2回目・asa）（まとめカードには載せない。nikkiSummary は seen_nikki_kesu だけを見る）
// seen_nikki_kesu    真     立て: room diary（asa。ポエムを消しゴムで消したとき）                       読み: room diary（asa）・nikkiSummary
// seen_nikki_asa     真     立て: room diary（asa。ポエムが無く、ゆうべの一行を読み返したとき）         読み: 同じ（読み返しは一度だけ）
// seen_receipt       真     立て: room desk（asa。レシートが出てきたとき）                              読み: 同じ（レシートは一度だけ）
// seen_ka            真     立て: kawara ka_a/ka_b/ka_c（touch・yu・一日一回）                          読み: 蚊の帯の when・room bed（yoru・asa）・nikkiKey
// seen_kairan_sign   真     立て: danchi kairanban（yu・＞＞1 サインする を選んだときだけ）              読み: danchi kairanban（yu・yoru の書いたあと・asa）・nikkiKey
// seen_piano_yu      真     立て: sumire yamada_door（yu と yoru）                                      読み: sumire yamada_door（asa の「こえた」）・room bed（布団の遠い音）
// seen_kichi_shinya  真     立て: sumire kichi_board_24/25（shinya・しゃがんだ）                        読み: 同じ（2回目は短い1行）・poemKey（kichi）
// seen_danchi_ue     真     立て: danchi a_stairs（shinya・いちばん上まで）                             読み: 同じ（2回目は短い1行）・poemKey・apart door_room（shinya）
// seen_suwari_kawara 真     立て: kawara fumiato（shinya・すわる）                                      読み: 同じ（2回目は短い1行）・apart win_st（shinya）・suwariNure（room bed）
// seen_taigan_shinya 真     立て: kawara taigan_view（shinya・末尾の3行を一度だけ）                     読み: 同じ・apart door_room（shinya）・apart win_st（shinya）
// seen_denki_bill    真     立て: street denki_bill（初回・キリコの駄菓子屋のボケ）                     読み: 同じ（二度目で下の紙）
// seen_board_st      真     立て: street board_ev（初回）                                               読み: 同じ（二度目で去年の紙）
// seen_gate_plate    真     立て: sumire gate_plate（初回）                                             読み: 同じ（二度目で『70』）
// seen_tenant        数     立て: tonarimachi tenant（調べるたび +1。段で数える）                       読み: 同じ（numFlag。二度目で看板の跡）
// seen_annaizu2      真     立て: danchi annaizu（初回）                                                読み: 同じ（二度目で D棟の点線）
// seen_urichi2       真     立て: ekimae urichi（初回）                                                 読み: 同じ（二度目で完成予想図）
// seen_tekkyo        真     立て: kawara tekkyo_belt（yu）                                              読み: room bed（布団の遠い音）・koen tesuri
// seen_mat           字     立て: apart mat（最後になおした tod）                                       読み: apart mat（strFlag）
// seen_kettle_yoru   数     立て: room kettle（yoru）                                                   読み: room kettle（numFlag）・room bed（yoru。1なら火をとめてから寝る）
// seen_koen_kaidan   数     立て: koen kaidan                                                           読み: koen kaidan（numFlag）
// seen_nawatobi      数     立て: danchi nawatobi_kid                                                   読み: danchi nawatobi_kid（numFlag）
// seen_suupaa_okusan 数     立て: suupaa okusan                                                         読み: suupaa okusan（numFlag）・danchi kaimono_yu（yu）
// seen_suupaa_wagon  数     立て: suupaa wagon                                                          読み: suupaa wagon（numFlag）
// ── 地区をまたぐ新しいフラグ（2026-10-04・下の「町をまたぐ筋」⑪〜㉛と強めた筋） ──
// seen_eshaku_st     真     立て: street eshaku（yu・作業着の人の会釈）                                 読み: umi yoake_arrive（asa）
// seen_denki_kaishu  真     立て: apart door_room（shinya・warp の前に一度）                            読み: 同じ（一度だけ）→ room pc（shinya）へ
// seen_koen_kasa     真     立て: koen wasuregasa（yu・yoru・shinya。『3の2　さとう』）                 読み: koen wasuregasa（asa）・street kodomo_asa_a（asa）
// got_hari           真     立て: tonarimachi record_oyaji（＞＞1 ひとつ買う）                          読み: room phono・nikkiKey
// seen_hari_mise     真     立て: tonarimachi record_oyaji（2回目・seen_kotto_phono の人）              読み: tonarimachi record_oyaji・room phono（買わなかった人）
// seen_hari_kaeta    真     立て: room phono（got_hari で一度）                                         読み: room phono・kirokuLines
// got_susuki         真     立て: kawara susuki_a（shinya・＞＞1 一本　もらう）                         読み: kawara susuki_a（asa）・room desk（shinya・asa。seen_susuki_kabin）・room calendar（asa）・umi fuchi（shinya）
// seen_keiji         真     立て: apart keiji（yu・yoru。『もえるゴミは　火・金』）                     読み: danchi gomi_asa（asa）・sumire gomidashi（asa）・room window（asa）
// seen_gomi_fuda     真     立て: danchi gomi（yu・yoru。『もえるごみ　火・金』）                       読み: danchi gomi_asa（asa）・sumire gomidashi（asa）・room window（asa）
// seen_suupaa_tamago 数     立て: suupaa speaker_ev（yu・段ごとに +1）                                  読み: suupaa speaker_ev・danchi kaimono_yu（yu。2 以上）
// seen_suupaa_hako   真     立て: suupaa hako（『みなみ』のはこ）                                       読み: ekimae suupaa_in（asa）
// seen_suupaa_milk   真     立て: suupaa milk_a（おくから取るくせ）                                     読み: ekimae truck_asa（asa）
// seen_suupaa_reitou 真     立て: suupaa reitou                                                         読み: ekimae mise_mado（shinya）
// seen_suupaa_koe    真     立て: suupaa baachan_ev（放送の声の種明かし。seen_suupaa_housou の人）      読み: ekimae mise_mado（yu）
// seen_suupaa_pan    真     立て: suupaa pan（あんぱん売りきれ）                                        読み: street offerDinner（yu）
// seen_inu_umi2      真     立て: umi inu_umi（yu の2回目）                                             読み: umi inu_umi・kawara inu_sanpo（asa）
// seen_runner_yama   真     立て: yamamichi runner_yu（yu。こしの鈴）                                   読み: kawara runner_asa（asa）・kawara runner_yu（yu・seen_runner_suzu）
// seen_sagi_yu       真     立て: kawara kawa_b（yu。中州のしらさぎ）                                   読み: kawara sagiBelt（asa）
// seen_sasabune      真     立て: sumire mizo（yu）                                                     読み: kawara hashi_ue（asa）
// seen_miharashi_eki 真     立て: koen sougankyou（shinya・100円）・yamamichi miharashiA/B（shinya）    読み: ekimae arrive_shinya
// seen_record_poster 真     立て: tonarimachi record_win                                                読み: room poster
// seen_record_oyaji3 真     立て: tonarimachi record_oyaji（3回目）                                     読み: senro to_tonarimachi（yoru）
// seen_arcade_lamp   真     立て: tonarimachi arcade_lamp                                               読み: senro to_tonarimachi（shinya）
// seen_kissa_nioi    真     立て: tonarimachi kissa_door（『モーニングやってます』）                    読み: senro to_tonarimachi（asa）
// seen_yaoya_n       数     立て: tonarimachi yaoya_oyaji（話すたび +1）                                読み: senro to_tonarimachi（asa・numFlag）
// seen_gacha_10en    真     立て: suupaa gacha（2回目・＞＞1 10円を　のせる）                           読み: street kodomo_asa_b（asa）
// seen_aki_danchi    真     立て: danchi kairanban／shuukaijo_ev（つきみ秋まつり）                      読み: akiMatsuri（room calendar・yamamichi susuki）
// seen_aki_suupaa    真     立て: suupaa nodojiman（2回目）                                             読み: akiMatsuri（room calendar・yamamichi susuki）
// seen_neko_senro    真     立て: senro ikidomari（yu）                                                 読み: nekoSeen・senro ikidomari（asa）
// seen_kichi_ishi    真     立て: sumire kichi_crate_b（ひらたい石が三つ）                              読み: sumire kichi_crate_b（asa）・kawara mizukiri_ishi（asa）
// seen_yashiro_houki 真     立て: kawara yashiro（yu・yoru。竹ぼうき）                                  読み: kawara houki_baachan（asa）
// seen_fumikiri_yoru 真     立て: senro fumikiri（yoru の場面）                                         読み: room bed（布団の遠い音）
// seen_koinu_mitsuke 真     立て: sumire（貼り紙の『しっぽの先だけ白い』子犬を見つけたとき）・
//                           sumire koinu_poster（asa。seen_koinu_dare の人）                            読み: kirokuLines
// ── 2巡目（2026-10-04）で足したフラグ（下の「2巡目で足した筋」㉜〜㊿と強めた筋） ──
// seen_mywin_ao      真     立て: street my_win（shinya）                                               読み: apart door_room（shinya）
// seen_eshaku_kutsu  真     立て: street eshaku（yu の2回目）                                           読み: umi yoake_arrive（asa）
// got_pizza_chirashi 真     立て: apart mybox（shinya）                                                 読み: room desk（asa・seen_pizza_asa で一度）
// seen_sagi_saka     真     立て: sumire saka_rail（yu）                                                読み: sumire saka_rail（asa）・kawara sagiBelt（asa）
// seen_kyusui_koen   真     立て: koen kyusuito（shinya）                                               読み: danchi kyusuito_ev（shinya）
// seen_kyusui_danchi 真     立て: danchi kyusuito_ev（shinya）                                          読み: koen kyusuito（shinya）・danchi kyusuito_ev（asa）
// seen_kakashi_yama  真     立て: yamamichi kakashi（yu）                                               読み: kawara kakashi（yu）・yamamichi kakashi（asa）
// seen_kakashi_orei  真     立て: yamamichi nouka_asa（asa の2回目・seen_kakashi_naoshi の人）          読み: 同じ（一度だけ）
// got_ishi_yama      真     立て: yamamichi kawa（yu・asa。seen_mizukiri_nage の人）                    読み: kawara mizukiri_ishi
// seen_ishi_kaeshi   真     立て: kawara mizukiri_ishi（石を山にのせた）                                読み: kawara mizukiri_ishi（asa）・mizukiri_kid（yu）・kirokuLines
// seen_hodo_yoru     真     立て: kokudo hodokyoView（yoru）                                            読み: yamamichi miharashi（yoru）
// seen_bukatsu_korokke 真   立て: kokudo bukatsu_kid（yu・got_korokke の人）                            読み: room evening
// seen_kanban_kokudo 真     立て: kokudo famiresu_kanban（asa）                                         読み: ekimae old_sign
// seen_ekimei_minami 真     立て: ekimae ekimei                                                         読み: tonarimachi ekimei
// seen_suupaa_zasshi 真     立て: suupaa zasshi                                                         読み: ekimae bikes（shinya）
// seen_suupaa_denchi 真     立て: suupaa rejiyoko                                                       読み: room clock（shinya）
// seen_suupaa_senzai 真     立て: suupaa nichiyou                                                       読み: room tv（yoru・seen_tv_senzai で一度）
// seen_suupaa_kome   真     立て: suupaa kome                                                           読み: yamamichi hazakake（yu）
// seen_suupaa_cupmen 真     立て: suupaa cupmen                                                         読み: room evening
// seen_umi_hashikko  真     立て: umi kurumadome/ikidomari/kyori_0（3つ見た）                           読み: apart shimi（asa）
// seen_suwari_nure   真     立て: room bed（shinya・suwariNure）                                        読み: 同じ（一度だけ）
// ── 2巡目で読み手を足した、地区の中で立つフラグ（立て方は各マップのまま。ここは読み手の控え） ──
// seen_tsuri2         真 立て: kawara tsuri_jichan                         読み: umi tsuribito_yu（yu）
// seen_toudai_kairi   真 立て: umi toudai（yu の2回目）                    読み: koen tesuri（shinya）
// seen_glove_sumire   真 立て: sumire bench_22/23                          読み: koen ball_kid（asa）
// seen_futon_tori     真 立て: danchi futon_tori（yu）                     読み: sumire monohoshi（yoru）
// seen_taiso_danchi   真 立て: danchi taiso_jichan（asa）                  読み: sumire jii_asa（asa）
// seen_neko_eki       真 立て: ekimae crates_b（yu）                       読み: danchi neko_ura（shinya）
// seen_gomi_hayai     真 立て: sumire gomi（shinya）                       読み: apart keiji（shinya）
// seen_senro_hosen    真 立て: senro arrive_shinya                         読み: ekimae rail_fence（asa）
// seen_kotto_radio    数 立て: tonarimachi kotto_oku                       読み: room tv（yoru）
// seen_kiosk          真 立て: ekimae kiosk_lady                           読み: suupaa okashi
// seen_ekimae_10en    真 立て: ekimae denwa                                読み: suupaa gacha
// seen_ekimae_jii     数 立て: ekimae jiichan                              読み: tonarimachi hata
// seen_baa_aji        真 立て: suupaa baachan_ev（会計のあと）             読み: ekimae chirashi（asa）・umi sakanabako（asa）
// seen_zasshi         真 立て: street bench_ev                             読み: suupaa zasshi・ekimae bikes（shinya）
// seen_wara_kemuri    真 立て: yamamichi arrive_yu                         読み: kawara arrive_yoru
// seen_kakashi_boushi 真 立て: kawara kakashi（yu）                        読み: yamamichi kakashi
// seen_kakashi_kaze   真 立て: kawara kakashi（yoru）                      読み: yamamichi kakashi
// seen_kakashi_naoshi 真 立て: kawara kakashi（asa・くいにかける）         読み: yamamichi nouka_asa・kirokuLines
// seen_fumikiri_yu    真 立て: senro fumikiriBelt（yu）                    読み: tonarimachi rideHome・mokei_b
// seen_mokei_b        数 立て: tonarimachi mokei_b                         読み: senro fumikiriBelt
// seen_record_naka    数 立て: tonarimachi record_naka                     読み: senro to_tonarimachi（yoru）
// seen_tonarimachi    真 立て: ekimae（電車に乗った）・tonarimachi rideHome 読み: ekimae ekimei・tonarimachi ekimei
// seen_susuki_kabin   真 立て: room desk（shinya）                         読み: room desk・calendar（asa）・umi fuchi（shinya。無い人に）
// seen_saisen         真 立て: kawara saisen（5円いれた）                  読み: nikkiKey（saisen）
// seen_koen_fu_nage   真 立て: koen ike（麩をなげた）                      読み: nikkiKey（fu）
// seen_funsui         真 立て: ekimae funsui（shinya・ふちに　のぼる）     読み: poemKey（fuchi）
// ── 既存のフラグ（ノスタルジー層は読むだけ。立て方は変えない） ──
// done:<map>:arrive_yoru  真 立て: エンジン（新設の arrive_yoru。6地区＋apart）   読み: yoruStep/yoruStepSt（6地区だけ数える）・yoruAkubi
// done:<map>:arrive_yu    真 立て: エンジン（既存の arrive_yu）                   読み: room bed（yoru の就寝。遠い音。arrived(s, map, "yu")）
// done:<map>:arrive_shinya 真 立て: エンジン（既存の arrive_shinya）              読み: shinyaWalked（room diary の shinya）
// seen_tenshu_asa         真 立て: street tenshuAsa（1回目）                      読み: street tenshuAsa
// seen_tenshu2            真 立て: street tenshu（yu の2回目・カーテンの話）      読み: street my_win（asa は、これがある人にだけ出る＝when）
// got_dinner_onigiri/pan  真 立て: street offerDinner                            読み: nikkiKey・street tenshuAsa・room（既存）・apart milk（asa。pan）
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

/** 深夜に着いた屋外の地区の数（0〜10）。arrive_shinya の once で数える。 */
export const shinyaStep = (s: Story): number =>
	OUTDOOR_DAILY.filter((m) => arrived(s, m, "shinya")).length;

/**
 * 深夜の町の時計（"2:05"〜"3:55"。shinyaStep ごとに11分進む）。off は時計ごとのずれ。
 * 夜は止まらない（夢オチ・時間停止にしない。2026-10-04）。部屋のかべの時計だけは電池ぎれで 2:00 のまま。
 */
export const shinyaClock = (s: Story, off = 0): string => {
	const m = 2 * 60 + 5 + 11 * shinyaStep(s) + off;
	return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};

// ───────────────── 朝の時計（2026-10-04） ─────────────────

/** 朝に着いた屋外の地区の数（0〜9。umi は arrive_asa を消すので数えない）。 */
export const asaStep = (s: Story): number =>
	OUTDOOR_DAILY.filter((m) => arrived(s, m, "asa")).length;

/**
 * 朝の町の時計（窓の場面のあと。street に着いた時点で "7:02"、地区ごとに4分。off は時計ごとのずれ）。
 * 呼ぶ所: street clock_tower（asaClock(s)）・barber（asaClock(s, 3)）・ekimae tokei（asaClock(s, 1)）・
 * ekimae jikoku（つぎの電車えらび）・umi eki_tokei（asaClock(s, 2)）・room clock（asaClock(s)）。
 * いちばん早くて 6:58、いちばん進んでも 7:37（9地区＋off 3）。
 * マップ側の朝の固定の時刻（満潮 6:52・始発 6:52／つぎの電車 7:41・8:02／バス 7:45・7:50）は、
 * この範囲（6:58〜7:37）の外に置く約束（時計が固定の時刻を追いこさないように）。
 */
export const asaClock = (s: Story, off = 0): string => {
	const m = 6 * 60 + 58 + 4 * asaStep(s) + off;
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
 * 呼ぶ所: street vending_ev・sumire vending・danchi vending_ev・kokudo vending_ev・ekimae jihanki・
 * senro jihanki_a・umi vending_ev（kokudo 北の(30,6)は対象外）。
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

/**
 * 朝の机（room desk の asa 分岐で `await kanAsa(s)`）。ゆうべ缶を買っていれば、その缶が机にある
 * （深夜の散歩が本当にあったことの物証。夢かどうかを ぼかさない）。
 */
export const kanAsa = async (s: Story): Promise<void> => {
	const lv = kanLv(s);
	if (lv === 0) return;
	await s.narrate(
		lv === 4
			? "机のすみに、ゆうべの\nあき缶が　立っている。"
			: "コートの　ポケットに、\nのみかけの　缶。つめたい。",
	);
};

// ───────────────── 一行日記（P0-4） ─────────────────

/** 宵の一行のキー（`seen_nikki_yoru` に文字で入れる）。 */
export type NikkiKey =
	| "hari"
	| "taiyaki"
	| "korokke"
	| "kairan"
	| "ka"
	| "saisen"
	| "chukei"
	| "fu"
	| "onigiri"
	| "pan"
	| "gyunyu"
	| "nashi";

/** 宵の一行（全部は書かない。nikkiKey が一つだけ選ぶ）。 */
export const NIKKI: Record<NikkiKey, string> = {
	hari: "『蓄音機の　針を、\nとなりまちで　買った』",
	taiyaki: "『たいやき。しっぽまで\nあんこ』",
	korokke: "『コロッケ　半額。\nはしっこ　おまけ』",
	kairan: "『回覧板に、サイン。\nこども　あつかい』",
	ka: "『かわらで、蚊に\nさされた』",
	saisen: "『かわらの　やしろに、\n5円。ねがいは　なし』",
	chukei: "『やきう、延長。\nさいごまで　見られず』",
	fu: "『公園の　コイに、麩。\nもらいものの』",
	onigiri: "『晩ごはん、おにぎり。\n鮭だった』",
	pan: "『晩ごはん、あんぱん。\n牛乳は　なかった』",
	gyunyu: "『あんぱんと、牛乳。\n牛乳は　コンビニの』",
	nashi: "『きょうも、とくに\nなし』",
};

/** 深夜のポエムのキー（`seen_nikki_shinya` に文字で入れる）。 */
export type PoemKey = "kan" | "nushi" | "ue" | "kichi" | "fuchi" | "machi";

/** 深夜のポエム（朝に消す前提の、少しダサい文）。 */
export const POEM: Record<PoemKey, string> = {
	kan: "『2時の　じはんきは、\n町の　心臓だった』",
	nushi: "『川の　ぬしは、吾輩に\nだけ　はねてみせた』",
	ue: "『町の灯りを　かぞえた。\n吾輩も、そのひとつ』",
	kichi: "『ひみつきちに、夜だけ\n入団した』",
	fuchi: "『噴水の　ふちは、\n吾輩の　国境だった』",
	machi: "『夜の町は、吾輩だけの\nものだった』",
};

// ───────────────── 町をまたぐ筋（2026-10-04） ─────────────────
// 散らばった前振りを、別の地区・朝・布団・日記で回収する。どれも「見た人にだけ」出す。
// ① ぬし: kawara tsuri_jichan（seen_tsuri2）・emakake・kawa_b 深夜（seen_kawa_shinya 数）→ tsuri_asa（seen_nushi）・poemKey
// ② きょり標: yamamichi 14.0km（seen_kyori_14）・kawara 12.5km（seen_kyori_12）→ umi 0.0km（seen_kyori_0）
// ③ まつり: 夏＝street board_ev（seen_board_st）・ekimae poster（seen_natsu_eki）・kawara hanabi_ato（seen_natsu_kawa）
//    秋＝tonarimachi matsuri_poster（seen_aki_tonari）・sumire keijiban（seen_aki_sumire）→ room calendar（asa。seen_cal_aki）
// ④ 電車の音: 夕方に聞いた電車（street・kawara・senro・umi）→ room の布団の遠い音（TOOI_OTO）／深夜は終電のあと
// ⑤ ねこ: street neko（seen_neko）・sumire alley_box（seen_neko_sumire）・kokudo neko_tamari（seen_neko_kokudo）
//    → danchi neko_ura 深夜（seen_neko_shukai）→ 朝、それぞれの場所へ もどる
// ⑥ 水きり: kawara mizukiri_ishi（seen_mizukiri_nage）→ kawara mizukiri_kid・umi mizukiri_umi（seen_mizukiri_kurabe）・朝の石の山
// ⑦ ろうそくの 人: street baachan（seen_baachan・seen_baachan2）・kawara jouyatou 深夜（seen_jouyatou_shinya）→ kawara houki_baachan（asa。seen_houki）
// ⑧ ガチャ: suupaa gacha_kid（seen_gacha_kid）→ street kodomo_asa_b（seen_gacha_asa）
// ⑨ あいあいがさ: kokudo hodokyo_rakugaki（seen_aiai_hodo）・yamamichi bench（seen_aiai_yama）→ 朝のベンチ
// ⑩ なくなる町（控えめ）: danchi annaizu（seen_annaizu2）→ taiso_jichan／ekimae urichi（seen_urichi2）→ old_sign／kokudo の灯らない自販機と缶
// ⑪ 早番の人: street eshaku（seen_eshaku_st）→ umi yoake_arrive（asa）
// ⑫ つけっぱなしのモニター: kawara taigan_view（seen_taigan_shinya）→ apart door_room（shinya・seen_denki_kaishu）→ room pc（shinya）
// ⑬ わすれがさ: koen wasuregasa（seen_koen_kasa）→ koen wasuregasa（asa）・street kodomo_asa_a（asa）
// ⑭ 蓄音機の針: tonarimachi kotto_phono（seen_kotto_phono）→ record_oyaji（seen_hari_mise・got_hari）→ room phono（seen_hari_kaeta）→ nikkiKey・kirokuLines
// ⑮ ススキ: kawara susuki_a（shinya・got_susuki）→ room desk（seen_susuki_kabin）
// ⑯ ゴミの日: apart keiji（seen_keiji）・danchi gomi（seen_gomi_fuda）→ danchi gomi_asa・sumire gomidashi（asa）
// ⑰ たまご: sumire obachan_a（seen_obachan）→ suupaa speaker_ev（seen_suupaa_tamago 数）→ danchi kaimono_yu → sumire gomidashi（asa）
// ⑱ スーパーの一晩: suupaa hako・milk_a・reitou・housou_first→baachan_ev（seen_suupaa_koe）・pan・baachan_ev（seen_baa・seen_baa2）・okusan
//    → ekimae mise_mado・suupaa_in・truck_asa・old_sign／street offerDinner・west_sign／danchi kaimono_yu
// ⑲ 天気よほう: room tv（seen_tenki）→ apart kasa（asa）
// ⑳ 犬のさんぽの人: umi inu_umi（seen_inu_umi・seen_inu_umi2）→ kawara inu_sanpo（asa）
// ㉑ 鈴のランナー: yamamichi runner_yu（seen_runner_yama）⇄ kawara runner_yu／runner_asa（seen_runner_yu）
// ㉒ しらさぎ: kawara kawa_b（seen_sagi_yu）→ sagiBelt（seen_sagi_asa）→ inu_sanpo・umi kyori_0（asa）
// ㉓ ささぶね: sumire mizo（seen_sasabune）→ kawara hashi_ue（asa）
// ㉔ 駅の灯り: koen sougankyou・yamamichi miharashi（shinya・seen_miharashi_eki）→ ekimae arrive_shinya
// ㉕ 通勤の人: senro tsuukin_asa（seen_senro_tsuukin）→ ekimae kaisatsu_gate・jikoku（asa）
// ㉖ となりまちの店じまい: tonarimachi record_owari／record_oyaji（seen_record_oyaji3）・arcade_lamp・kissa_door・yaoya_oyaji
//    → senro to_tonarimachi（yoru・shinya・asa）
// ㉗ ふたつのすきま: tonarimachi sukima（seen_sukima）⇄ senro sukima_ikegaki（seen_senro_sukima）
// ㉘ コロッケ: suupaa korokke（got_korokke）→ room evening・kokudo bukatsu_kid・tonarimachi kaimono_wife
// ㉙ 中古盤のポスター: tonarimachi record_win（seen_record_poster）→ room poster
// ㉚ ふとんのばあちゃん: danchi futon_tori（seen_futon_tori）→ danchi b_futon・futon_tori（asa）・room bed（yoru）
// ㉛ やきうの前振り: room evening のスレ（全員）・room pc（seen_asa_thread）→ umi yakiu_end
// （強めた既存の筋）
//    P0-2 延長: seen_chukei_end → apart d502・street denki_tv/h2_door・danchi b_win_tv・umi koya_door
//    ③: akiMatsuri（seen_aki_danchi・seen_aki_suupaa を足す）→ room calendar・yamamichi susuki
//    ④: room の布団の遠い音は、聞いた人の旗だけで鳴らし、電車は1つだけ
//       （street seen_densha_yu・kawara seen_tekkyo・senro seen_fumikiri_yoru を足す）
//    ⑤: nekoSeen に seen_neko_senro、朝のもどり先に ekimae crates_b・danchi neko_ura・senro ikidomari・umi sakanabako
//    ⑥: sumire kichi_crate_b（seen_kichi_ishi）→ kawara mizukiri_ishi
//    ⑦: street seen_baachan2・kawara seen_yashiro_houki・seen_ishidan → houki_baachan
//    ⑧: suupaa gacha（seen_gacha_10en）→ street kodomo_asa_b
//    ②: umi seen_kyori_0 → apart shimi
// ── 2巡目（2026-10-04）で足した筋 ──
// ㉜ 保線の車: senro arrive_shinya・rail（seen_senro_hosen・shinyaStep でガードへ）→ senro arrive_asa・michi_owari（asa）・ekimae rail_fence（asa）
// ㉝ ふたつの給水塔: koen kyusuito（seen_kyusui_koen）⇄ danchi kyusuito_ev（seen_kyusui_danchi）（深夜。もう一方を見た人にだけ）
// ㉞ 月曜の号: street bench_ev（seen_zasshi）・suupaa zasshi（seen_suupaa_zasshi）→ ekimae bikes（shinya）・street sagyo_asa
// ㉟ 夜つゆのすそ: すわる4か所（suwariNure）→ room bed（shinya・seen_suwari_nure）
// ㊱ ふたつのかかし: kawara kakashi（seen_kakashi_boushi・kaze・naoshi）⇄ yamamichi kakashi（seen_kakashi_yama）→ yamamichi nouka_asa（seen_kakashi_orei）・kirokuLines
// ㊲ わらのけむり: yamamichi arrive_yu（seen_wara_kemuri）・tanbo_minami（seen_wara_yama）→ kawara arrive_yoru・tanbo_minami（asa・seen_wara_imo）→ mujin_asa（seen_imo_kiku）
// ㊳ ふたつの駅名: ekimae ekimei（seen_ekimei_minami）⇄ tonarimachi ekimei（done:tonarimachi:arrive・seen_tonarimachi）
// ㊴ 骨董屋のラジオ: tonarimachi kotto_oku（seen_kotto_radio 2）→ room tv（yoru の 1対1）
// ㊵ ジオラマのふみきり: tonarimachi mokei_b（seen_mokei_b 数）⇄ senro fumikiriBelt（seen_fumikiri_yu）→ tonarimachi rideHome・senro shadanki（asa）
// ㊶ 国道のライト: kokudo hodokyoView（yoru・seen_hodo_yoru）→ yamamichi miharashi（yoru）
// ㊷ 灯台の八海里: umi toudai（seen_toudai_kairi）→ koen tesuri（shinya）
// ㊸ たけしのグローブ: sumire bench（seen_glove_sumire）・koen catch_kid（seen_koen_kid）→ koen ball_kid（asa・seen_koen_kid_glove）
// ㊹ あしたのアジフライ: suupaa baachan_ev（seen_baa_aji）・okusan（数）→ ekimae chirashi（asa）・umi sakanabako（asa）
// ㊺ スーパーの棚と部屋: suupaa rejiyoko（seen_suupaa_denchi）・nichiyou（seen_suupaa_senzai）・cupmen（seen_suupaa_cupmen）→ room clock（shinya）・tv（yoru・seen_tv_senzai）・evening
// ㊻ ピザやのチラシ: apart mybox（shinya・got_pizza_chirashi）→ room desk（asa・seen_pizza_asa）
// ㊼ しんまい: suupaa kome（seen_suupaa_kome）→ yamamichi hazakake（yu）
// ㊽ 体操のじいさんたち: danchi taiso_jichan（seen_taiso_danchi）→ sumire jii_asa（2回目から）
// ㊾ まるい字の『みなみ』: kokudo driveinn_sign（seen_drivein_kokudo）・famiresu_kanban（asa・seen_kanban_kokudo）→ ekimae old_sign
// ㊿ 駅前の小さな受け: ekimae kiosk_lady（seen_kiosk）→ suupaa okashi／denwa（seen_ekimae_10en）→ suupaa gacha／jiichan（seen_ekimae_jii）→ tonarimachi hata
// （2巡目で強めた筋）
//    ⑫: street my_win（seen_mywin_ao）・danchi a_stairs（seen_danchi_ue）も apart door_room の条件に → room pc（shinya・seen_pc_ao・shinyaClock）
//    ⑪: street eshaku 2回目（seen_eshaku_kutsu）→ umi yoake_arrive
//    ⑥: yamamichi kawa（got_ishi_yama）→ kawara mizukiri_ishi（seen_ishi_kaeshi）→ mizukiri_kid・kirokuLines
//    ㉑: kawara runner_yu が seen_runner_yama を読む（seen_runner_suzu）
//    ㉒: sumire saka_rail（seen_sagi_saka）→ kawara sagiBelt
//    ⑤: ekimae crates_b（seen_neko_eki）→ danchi neko_ura／kokudo neko_tamari（shinya）が seen_neko_shukai を読む
//    ③: tonarimachi matsuri_poster が seen_aki_sumire/danchi/suupaa を読む（seen_aki_kurabe）・danchi soko_crate（akiMatsuri）
//    ②: umi kurumadome・ikidomari・kyori_0（seen_umi_hashikko）→ apart shimi
//    ④: street densha_asa（seen_densha_asa）・umi tunnel_mouth/jikokuhyo（seen_umi_densha）・room TOOI_OTO（umi を前へ）
//    ①: umi tsuribito_yu が seen_tsuri2 を読む（seen_umi_nushi）・kawara tsuri_asa が seen_tsuri_ato を読む（seen_tsuri_baketsu）
//    ⑦: street flower_ev（seen_baachan・seen_baachan2）・kawara saisen（asa のなし・seen_houki）
//    ⑮: room desk・calendar（asa）・umi fuchi（shinya）が seen_susuki_kabin／got_susuki を読む
//    ⑯: room window（asa）・apart keiji（shinya・sumire seen_gomi_hayai）
//    ⑲: seen_tenki → umi fune_b（asa）・danchi taiso_kanban（yoru）
//    ㉘: kokudo bukatsu_kid（seen_bukatsu_korokke）→ room evening
//    ㉚: danchi futon_tori の朝が 405 を読む（seen_405_wagomu → postbox_a）・sumire monohoshi（yoru）
//    P0-1 誘い: room window（seen_yoru_sasoi）→ street arrive_yoru（seen_sasoi_kaeri）
//    P0-2: sumire kondo_win（yoru）が seen_chukei_end を読む
//    日記・ポエム: kawara saisen（seen_saisen）・koen ike（seen_koen_fu_nage）→ nikkiKey／sumire kichi_board（seen_kichi_shinya）・ekimae funsui（seen_funsui）→ poemKey

/** 夏まつりの 名残を いくつ 見たか（0〜3）。3つめで キリコが 一言（seen_natsu_owari）。 */
export const natsuCount = (s: Story): number =>
	["seen_board_st", "seen_natsu_eki", "seen_natsu_kawa"].filter(
		(k) => !!s.flag(k),
	).length;

/** 夏まつりの 名残を 見たとき（3つめで 一度だけ）。 */
export const natsuOwari = async (s: Story): Promise<void> => {
	if (s.flag("seen_natsu_owari") || natsuCount(s) < 3) return;
	s.set("seen_natsu_owari");
	await s.say("kiriko", "……夏は、ちゃんと\nおわったンゴね");
};

/** 来月の つきみ秋まつりの おしらせを どこかで 見たか（③）。読む所: room calendar（asa）・yamamichi susuki（yu）。 */
export const akiMatsuri = (s: Story): boolean =>
	[
		"seen_aki_tonari",
		"seen_aki_sumire",
		"seen_aki_danchi",
		"seen_aki_suupaa",
	].some((k) => !!s.flag(k));

/** 夕方に ねこを 見た 場所の 数（深夜の あつまりの 条件）。seen_neko_senro は senro ikidomari の夕方。 */
export const nekoSeen = (s: Story): number =>
	[
		"seen_neko",
		"seen_neko_sumire",
		"seen_neko_kokudo",
		"seen_neko_senro",
	].filter((k) => !!s.flag(k)).length;

/**
 * まとめカード「こんやの　きろく」の行数の上限。
 * umi のまとめは にっき1〜2行（別の見出し）＋レコード＋この8行＋保守 で12行まで。
 * 「こんやの　きろく」の見出しは レコード＋8＋保守 で10行＝validate の MAX_SUMMARY_LINES（1見出しの上限）。
 */
const KIROKU_MAX = 8;

/** まとめカードの「こんやの　きろく」に足す行（筋を 回収した ものだけ。上から KIROKU_MAX 行まで）。 */
export const kirokuLines = (s: Story): string[] => {
	const lines: string[] = [];
	if (s.flag("seen_nushi")) lines.push("川の　ぬしの　音を　きいた");
	if (s.flag("seen_kyori_0")) lines.push("川を　14キロ　くだった");
	if (s.flag("seen_hari_kaeta")) lines.push("蓄音機の　針を　かえた");
	if (s.flag("seen_cal_aki")) lines.push("秋まつりに　まるを　つけた");
	if (s.flag("seen_neko_shukai")) lines.push("ねこの　あつまりを　見た");
	if (s.flag("seen_mizukiri_nage"))
		lines.push(
			s.flag("seen_ishi_kaeshi")
				? "水きりの　石を　かえした"
				: s.flag("seen_mizukiri_kurabe")
					? "水きり　三回　ひきわけ"
					: "水きり　三回",
		);
	if (s.flag("seen_houki")) lines.push("やしろの　ろうそくの　人");
	// 朝の男の子は、まだ回していない（見たとおりに書く）
	if (s.flag("seen_gacha_asa"))
		lines.push(
			s.flag("seen_gacha_10en")
				? "あしたの　ぼくに　10円"
				: "ガチャの子に　朝　会った",
		);
	if (s.flag("seen_aiai_kansei")) lines.push("あいあいがさが　そろった");
	if (s.flag("seen_koinu_mitsuke"))
		lines.push("しっぽの白い　子犬を　見つけた");
	if (s.flag("seen_koen_ball_bench") && s.flag("seen_koen_kid_asa"))
		lines.push("ボールを　ベンチに　のせた");
	if (s.flag("seen_kakashi_naoshi")) lines.push("かかしの　ぼうしを　かけた");
	return lines.slice(0, KIROKU_MAX);
};

/** まとめカードの見出し（street endingAtKakoi の sections の先頭に `{ title: NIKKI_TITLE, lines: nikkiSummary(s) }`）。 */
export const NIKKI_TITLE = "きのうの　にっき";

/**
 * 宵に書く一行を選ぶ（優先順で一つだけ）。
 * got_hari > got_taiyaki > got_korokke > seen_kairan_sign > seen_ka > seen_saisen（saisen）> seen_chukei_end >
 * seen_koen_fu_nage（fu）> got_dinner_onigiri > got_dinner_pan（got_gyunyu なら gyunyu）> nashi。
 * room diary が `s.set("seen_nikki_yoru", nikkiKey(s))` する。
 */
export const nikkiKey = (s: Story): NikkiKey => {
	if (s.flag("got_hari")) return "hari";
	if (s.flag("got_taiyaki")) return "taiyaki";
	if (s.flag("got_korokke")) return "korokke";
	if (s.flag("seen_kairan_sign")) return "kairan";
	if (s.flag("seen_ka")) return "ka";
	if (s.flag("seen_saisen")) return "saisen";
	if (s.flag("seen_chukei_end")) return "chukei";
	if (s.flag("seen_koen_fu_nage")) return "fu";
	if (s.flag("got_dinner_onigiri")) return "onigiri";
	if (s.flag("got_dinner_pan")) return s.flag("got_gyunyu") ? "gyunyu" : "pan";
	return "nashi";
};

/**
 * 深夜のポエムを選ぶ（場所の記憶を先に。缶はどこでも買えるので後ろ）:
 * nushi（深夜の川で2回・numFlag(seen_kawa_shinya)>=2）> ue（丘・峠から町の灯りを見た：
 * seen_danchi_ue・seen_suwari_koen・seen_suwari_yamamichi。yamamichi の suwaru で灯りをかぞえる回収）>
 * kichi（seen_kichi_shinya）> fuchi（seen_funsui）> kan（kanLv>0）> machi。
 * room diary が `s.set("seen_nikki_shinya", poemKey(s))` する。
 */
export const poemKey = (s: Story): PoemKey => {
	if (numFlag(s, "seen_kawa_shinya") >= 2) return "nushi";
	if (
		s.flag("seen_danchi_ue") ||
		s.flag("seen_suwari_koen") ||
		s.flag("seen_suwari_yamamichi")
	)
		return "ue";
	if (s.flag("seen_kichi_shinya")) return "kichi";
	if (s.flag("seen_funsui")) return "fuchi";
	if (kanLv(s) > 0) return "kan";
	return "machi";
};

/** 深夜に、夜つゆの つく 場所に すわったか（kawara 土手・senro ブロックべい・koen 展望台・yamamichi 峠）。room bed（shinya）が「コートの　すそ」で一度だけ読む（seen_suwari_nure）。 */
export const suwariNure = (s: Story): boolean =>
	[
		"seen_suwari_kawara",
		"seen_suwari_senro",
		"seen_suwari_koen",
		"seen_suwari_yamamichi",
	].some((k) => !!s.flag(k));

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
