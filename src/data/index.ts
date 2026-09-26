// ゲームデータをまとめる（DESIGN §4〜§6・§10）。

import type { GameData } from "../engine/defs";
import { bgm } from "./bgm";
import { cast } from "./cast";
import { debug, debugStart } from "./maps/debug";
import { hub } from "./maps/hub";
import { kakolog2 } from "./maps/kakolog2";
import { kisaragi } from "./maps/kisaragi";
import { kura } from "./maps/kura";
import { room } from "./maps/room";
import { terminus } from "./maps/terminus";
import { train } from "./maps/train";
import { tunnel } from "./maps/tunnel";
import { village } from "./maps/village";
import { yellow } from "./maps/yellow";
import { notes } from "./notes";
import { items, records } from "./records";
import { sfx } from "./sfx";

export const data: GameData = {
	title: "蓄音キリコと\nきさらぎ回線",
	subtitle: "おんJ発 ネットロア・ウォーキングシミュレーター",
	maps: {
		room,
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
	start: {
		mapId: "room",
		x: 2,
		y: 4,
		dir: "down",
		flags: {},
	},
	debug: debugStart,
	credits: [
		"# 蓄音キリコと　きさらぎ回線",
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
		"足立レイ",
		"© Mechanical Girl",
		"",
		"つくよみちゃん",
		"© Rei Yumesaki",
		"（フリー素材キャラクター。音源の利用は",
		"　公式の利用規約に　したがっています）",
		"https://tyc.rei-yumesaki.net/",
		"",
		"ミャウミャウ・ネムリン・おんちゃん",
		"にぃちぇ・ムッジェ",
		"（おんJwiki 出典の　非公式ファン創作）",
		"なんJ・おんJ のみんな",
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
		"# おしまい",
	],
};
