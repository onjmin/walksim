// ゲームデータをまとめる（DESIGN §4〜§6・§10）。

import type { GameData } from "../engine/defs";
import { bgm } from "./bgm";
import { cast } from "./cast";
import { apart } from "./maps/apart";
import { danchi } from "./maps/danchi";
import { debug, debugStart } from "./maps/debug";
import { ekimae } from "./maps/ekimae";
import { hub } from "./maps/hub";
import { kakolog2 } from "./maps/kakolog2";
import { kawara } from "./maps/kawara";
import { kisaragi } from "./maps/kisaragi";
import { koen } from "./maps/koen";
import { kokudo } from "./maps/kokudo";
import { kura } from "./maps/kura";
import { room } from "./maps/room";
import { senro } from "./maps/senro";
import { street } from "./maps/street";
import { sumire } from "./maps/sumire";
import { suupaa } from "./maps/suupaa";
import { terminus } from "./maps/terminus";
import { tonarimachi } from "./maps/tonarimachi";
import { train } from "./maps/train";
import { tunnel } from "./maps/tunnel";
import { umi } from "./maps/umi";
import { village } from "./maps/village";
import { yamamichi } from "./maps/yamamichi";
import { yellow } from "./maps/yellow";
import { notes } from "./notes";
import { items, records } from "./records";
import { sfx } from "./sfx";

export const data: GameData = {
	title: "蓄音キリコと\nよふかしのまち",
	subtitle: "おんJ発 ウォーキングシミュレーター",
	maps: {
		room,
		apart,
		street,
		// 日常の町 拡張（座標凍結v3。content-briefs「日常の町 拡張」）
		sumire,
		kawara,
		danchi,
		kokudo,
		ekimae,
		suupaa,
		tonarimachi,
		senro,
		yamamichi,
		koen,
		umi,
		hub,
		yellow,
		village,
		kura,
		kakolog2,
		train,
		kisaragi,
		tunnel,
		terminus,
		debug,
	},
	cast,
	items,
	records,
	notes,
	bgm,
	sfx,
	titleBgm: "title",
	endingBgm: "ending",
	// 日常の地区の BGM（生活音の下にごく薄く。作者判断 2026-09-27。MapDef.bgm = "@tod"）
	todBgm: {
		yu: "amb_yu",
		yoru: "amb_yoru",
		shinya: "amb_shinya",
		asa: "amb_asa",
	},
	// 夕方の帰り道から始まる（DESIGN §4 時間帯システム・座標凍結v2）。
	// 東寄りの大どおりで西向き＝アパートへ帰るおつかい（晩ごはん）の導線。
	start: {
		mapId: "street",
		x: 24,
		y: 10,
		dir: "left",
		flags: { tod: "yu" },
	},
	debug: debugStart,
	credits: [
		"# 蓄音キリコと　よふかしのまち",
		"",
		"# 登場キャラクター",
		"蓄音キリコ",
		"© おーぷん2ちゃんねる有志",
		"（音声: 野良 / キャラクター: 釣りンゴ / ロゴ: ロゴ太郎）",
		"https://suzuhete.wixsite.com/home",
		"",
		"束音ロゼ",
		"（音声: 面倒ミル / キャラクター: wQ8G）",
		"https://tabaneroze.ninja-web.net/",
		"",
		"重音テト",
		"© 線・小山乃舞世／TWINDRILL",
		"https://kasaneteto.jp/",
		"",
		"足立レイ",
		"© Mechanical Girl",
		"https://mechanicalgirl.jp/",
		"",
		"つくよみちゃん",
		"© Rei Yumesaki",
		"（フリー素材キャラクター。音源の利用は",
		"　公式の利用規約に　したがっています）",
		"https://tyc.rei-yumesaki.net/",
		"",
		"春音リノ（音源 rino121）",
		"https://harunerino.vercel.app/",
		"",
		"革命シヨ",
		"https://kakumeisiyo.my.canva.site/dagkuyjwycs",
		"",
		"響化アル",
		"https://hibikaaru.wixsite.com/aruofficial/利用規約",
		"",
		"解音ゼロ",
		"（声の収録がない UTAU 企画。本作では",
		"　音声合成を使わず、筆談キャラクター",
		"　として登場します）",
		"https://zero-tokine-test.my.canva.site",
		"おーぷん2ちゃんねるの企画スレのみなさん",
		"",
		"欲音ルコ♂・♀（終盤のカメオ音声）",
		"https://long-sleeper.net/index.php?id=22",
		"",
		"MGRoid・MOTRoid・NYNRoid",
		"（クッキー☆由来の UTAU 音源。終盤の",
		"　カメオ音声として、声のみ使用）",
		"https://x.com/nisusansu/status/1048825378188353536",
		"https://www.nicovideo.jp/watch/sm40031282",
		"https://www.bilibili.com/video/BV1V24y1a7qs",
		"",
		"ミャウミャウ・ネムリン・おんちゃん",
		"にぃちぇ・ムッジェ",
		"（おんJwiki 出典の　非公式ファン創作）",
		"なんJ・おんJ のみんな",
		"",
		"優音アイ・君野うしろ・雲地アル",
		"（おんJ・おーぷん2ちゃんねるの企画スレ発",
		"　キャラクターの　非公式ファン創作）",
		"",
		"（本作のキャラクターの口調・設定の一部は",
		"　非公式の創作です）",
		"",
		"# もとになった　インターネット怪談",
		"きさらぎ駅・八尺様・バックルーム　ほか",
		"（ネットロアを　もとにした創作です。",
		"　本作はフィクションです。実在の駅・",
		"　人物・掲示板の出来事とは　関係ありません）",
		"",
		"# 原案・ディレクター",
		"このゲームの作者",
		"",
		"# シナリオ・ゲームデザイン・マップデザイン",
		"Claude Code（Claude Fable 5）",
		"",
		"# プログラム・デバッグ",
		"Claude Code（Claude Fable 5）",
		"",
		"# 音楽",
		"このゲームの作者",
		"Claude Code（Claude Fable 5）",
		"",
		"# 素材提供",
		"RPGEN（効果音・ドット絵）",
		"キリコの歩行グラ: https://i.imgur.com/hNXnQHv.png",
		"",
		"# 音声合成",
		"@onjmin/dtm・koe UtauTTS",
		"HTS voice tohoku-f01",
		"(CC BY 4.0, Tohoku University)",
		"",
		"# フォント",
		"DotGothic16",
		"",
		"# スペシャルサンクス",
		"おーぷん2ちゃんねる　なんでも実況J のみんな",
		"",
		"（信号灯の点滅は、和文モールス符号）",
		"",
		"# おしまい",
	],
};
