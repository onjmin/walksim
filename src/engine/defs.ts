// ゲームデータ（マップ・イベント・キャラ・レコード）とシナリオ API の型。
// src/data/ 以下はこの型に沿って書く。

import type { Dir } from "./types";

// ───────────────── マップ ─────────────────

export type TileDef = {
	/** 下から順に重ねる画像参照（`sp:<id>` 等。engine/assets.ts の resolveRef）。 */
	layers: string[];
	/** 画像が読めないときの塗り色。 */
	color: string;
	/** 通れるか。 */
	passable: boolean;
	/** キャラより手前に描く画像（木の葉・屋根のひさし等）。 */
	above?: string[];
	/** カウンター（向こう側の人に話しかけられる）。 */
	counter?: boolean;
};

export type EventTrigger =
	/** A ボタン／タップで話しかける。 */
	| "talk"
	/** 上に乗ったとき（扉・ワープ・イベント床）。 */
	| "touch"
	/** 条件を満たしたら自動で始まる（カットシーン）。`once` と併用が基本。 */
	| "auto";

export type EventDef = {
	id: string;
	x: number;
	y: number;
	/**
	 * 見た目。`char:<キャラID>`（キャラの歩行グラ）/ `sa:<id>`（RPGEN 歩行グラ）/
	 * `sp:<id>`（単体スプライト）/ `pub:<path>`。省略すると見えないイベント。
	 */
	sprite?: string;
	dir?: Dir;
	trigger: EventTrigger;
	/** 通り抜けられる（見えない踏みイベント・床の模様など）。見た目なしなら既定で true。 */
	through?: boolean;
	/** うろうろ歩く。 */
	wander?: boolean;
	/** 向きを変えない（看板・オブジェ等）。 */
	fixedDir?: boolean;
	/** 出現条件。偽の間はマップに居ない扱い。 */
	when?: (s: GameState) => boolean;
	/** 1回だけ実行する（実行後 `done:<map>:<id>` が立ち、以後は消える）。 */
	once?: boolean;
	run?: Script;
};

/** ただよう粒（雰囲気）。roguelike の drawAmbient 移植（ステートレス決定論）。 */
export type AmbientDef = {
	kind: "dust" | "snow" | "rain" | "static" | "embers";
	/** 粒の色（省略は kind ごとの既定色）。 */
	color?: string;
};

export type MapDef = {
	id: string;
	/** 画面に出す地名。 */
	name: string;
	/** BGM 名（data/bgm.ts）。null なら無音、省略なら前の曲を続ける。 */
	bgm?: string | null;
	/** 行の各文字 → タイル。 */
	tiles: Record<string, TileDef>;
	/** マップ本体（1文字 = 1マス）。全行同じ長さにする。 */
	rows: string[];
	events?: EventDef[];
	/** ただよう粒（黄色い部屋の dust 等）。 */
	ambient?: AmbientDef;
	/** ワールド全体に乗せる半透明の色（夕暮れ `rgba(120,40,60,0.25)` 等。イベント描画後・UI前）。 */
	tint?: string;
	/**
	 * 暗闇（0〜1）。プレイヤー中心の光半径（既定3.5タイル、フラグ `flashlight` で6.5）の
	 * 外を、この濃さで暗くする。
	 */
	dark?: number;
	/** マップに入るたびに走るスクリプト（ワープの後）。 */
	onEnter?: Script;
	/** マップの外側の色。 */
	outside?: string;
	/** 屋外。flags.tod により TOD_PRESETS（engine/game.ts）の色調が乗る。 */
	outdoor?: boolean;
};

// ───────────────── キャラ ─────────────────

export type VoiceDef = {
	/** dtm の koe 音源キーワード（uc / roze / rei / tsukuyomi …）。 */
	model: string;
	pitchOffset?: number;
	emotion?: "neutral" | "happy" | "sad" | "angry";
	style?: "neutral" | "calm" | "lively";
};

export type CharDef = {
	id: string;
	/** メッセージ窓の名前欄。 */
	name: string;
	/** 歩行グラ（`sa:<id>` / `pub:sprites/xxx.png`）。 */
	walk: string;
	/** 名前欄・ダミー立ち絵の色。 */
	color: string;
	/** 読み上げ音源（あれば UtauTTS で読み上げる）。 */
	voice?: VoiceDef;
	/** "slow" はセリフをいつも重い文として出す（SayOptions.pace で1行ずつ変えられる）。 */
	pace?: "slow";
	/**
	 * 立ち絵。透過 PNG を public/portraits/ に置いて `src` を指す。
	 * ファイルが無い／読めないときはダミー表示になる。
	 * - side: いつも立つ側（ほかの話し手でふさがっていれば自動で反対側へ回る）
	 * - facing: 絵のキャラが向いている向き（既定 "right"）。立つ側と合わなければ自動で左右反転する
	 * 透明な余白を切り詰め、全身の高さ・頭の位置を測って自動でそろえるので、キャンバスの大きさや余白は自由。
	 * scale / offsetX / offsetY は自動でそろえたあとの手直し（ふつうは要らない）。
	 */
	portrait?: {
		src: string;
		side?: "left" | "right";
		/** ふさがっていても反対側へ回らない（反転した絵を必ず見せたいときなど）。 */
		fixedSide?: boolean;
		/** 色を反転して出す（ほかのキャラの絵を使い回して別人に見せる）。 */
		invert?: boolean;
		facing?: "left" | "right";
		/** 全身絵の上から何割を見せるか（既定 0.58 ＝頭〜腰あたり。1 で全身）。 */
		crop?: number;
		/** 大きさの倍率（既定 1）。 */
		scale?: number;
		/** 描いた絵の右へずらす（全身の高さに対する割合。反転したときは逆へ）。 */
		offsetX?: number;
		/** 下へずらす（全身の高さに対する割合）。 */
		offsetY?: number;
	};
};

// ───────────────── アイテム・レコード ─────────────────

export type ItemDef = {
	id: string;
	name: string;
	desc: string;
	/** 大事なもの（使えない・減らない）。本作のアイテムは全部これ。 */
	key?: boolean;
};

/**
 * レコード盤（消えたおんJ民の「最終レス」）。Story.record(id) が再生する。
 * 入手は各マップのスクリプトが give で行い、持ちものとしては items に入る
 * （id は data/index.ts の items にも同じ id で登録しておく）。
 */
export type RecordDef = {
	id: string;
	/** メニューの一覧に出す題名。 */
	title: string;
	/** 朗読の声（省略すると声なしで文字だけ）。 */
	voice?: { model: string; pitchOffset?: number };
	/**
	 * 「本人の声」（DESIGN §6）。終点・供養スレ駅の一斉再生
	 * （Story.record の opt.trueVoice）でだけ、voice の代わりに使う。
	 */
	trueVoice?: { model: string; pitchOffset?: number };
	/** 日付表記（「2021/03/15(月) 03:0X」風）。再生中は名前欄に出る。 */
	date: string;
	/** 本文（1要素 = メッセージ窓1枚。全角22字×2行まで）。 */
	lines: string[];
};

/**
 * かいいノートの1ページ（怪異コレクション。DESIGN §6.5）。
 * 発見はシナリオが Story.note(id) で書き留め（フラグ `note_<id>`）、
 * メニューの「ノート」がいつでも読み返せる一覧にする。
 */
export type NoteDef = {
	id: string;
	/** ノートの見出し（短い通称。「きさらぎ駅」等）。 */
	title: string;
	/** 本文（キリコのメモ書き風。1要素 = 1行、全角22字まで・2〜4行）。 */
	lines: string[];
	/** 未発見のとき「？？？」の下に薄く出すヒント（数語）。 */
	hint?: string;
};

// ───────────────── セーブされる状態 ─────────────────

export type GameState = {
	mapId: string;
	x: number;
	y: number;
	dir: Dir;
	/**
	 * 進行フラグ。時間帯は flags.tod = "yu"|"yoru"|"shinya"|"asa"（将来 "hiru"）で持ち、
	 * outdoor マップの色調（TOD_PRESETS）とイベントの when/onEnter 分岐が参照する（DESIGN §4）。
	 */
	flags: Record<string, number | boolean | string>;
	items: Record<string, number>;
	playMs: number;
};

// ───────────────── ゲーム全体のデータ ─────────────────

export type GameData = {
	title: string;
	subtitle?: string;
	maps: Record<string, MapDef>;
	cast: Record<string, CharDef>;
	items: Record<string, ItemDef>;
	/** レコード盤（Story.record が引く）。 */
	records: Record<string, RecordDef>;
	/** かいいノート（Story.note が引き、メニューの「ノート」が一覧する）。 */
	notes: Record<string, NoteDef>;
	/** BGM 名 → MML。 */
	bgm: Record<string, string>;
	/** 効果音名 → `rpgen:<id>`（RPGEN の mp3）か MML。 */
	sfx: Record<string, string>;
	titleBgm: string;
	endingBgm: string;
	start: {
		mapId: string;
		x: number;
		y: number;
		dir: Dir;
		items?: Record<string, number>;
		flags?: Record<string, number | boolean | string>;
	};
	/** スタッフロール（1要素 = 1行。空文字で間を空ける。"# " で始まる行は見出し）。 */
	credits: string[];
	/** デバッグルームの入口（開発中か URL に ?debug があるとき、タイトルに「デバッグルーム」を出す）。 */
	debug?: { mapId: string; x: number; y: number; dir: Dir };
};

// ───────────────── シナリオ API ─────────────────

export type Script = (s: Story) => Promise<void>;

export type SayOptions = {
	/** 名前欄を差し替える（「？？？」等）。 */
	name?: string;
	/** 立ち絵を出さない。 */
	noPortrait?: boolean;
	/** 読み上げない。 */
	noVoice?: boolean;
	/** 読み上げの感情を一時的に変える。 */
	emotion?: VoiceDef["emotion"];
	/** 重い文（ゆっくり出し、連打で飛ばさない。ui/message.ts）。キャラの pace より先。 */
	pace?: "slow" | "normal";
};

/** エンディングのまとめカード（スタッフロールのあとに出す）。1行は全角22字まで。 */
export type EndingSummary = { sections: { title: string; lines: string[] }[] };

export type Story = {
	readonly state: GameState;
	/** セリフ。who は キャラID（data/cast.ts）か null（地の文）。 */
	say(who: string | null, text: string, opt?: SayOptions): Promise<void>;
	/** 地の文。 */
	narrate(text: string): Promise<void>;
	/** 選択肢。選ばれた番号を返す。 */
	choose(options: string[], opt?: { cancel?: number }): Promise<number>;
	wait(ms: number): Promise<void>;
	fadeOut(ms?: number, color?: string): Promise<void>;
	fadeIn(ms?: number): Promise<void>;
	/** BGM を切り替える（null で止める）。 */
	bgm(name: string | null): void;
	/**
	 * 効果音（data/sfx.ts の名前）。pan は左右の寄り（-1 左〜1 右。「ぽ……ぽ……」の距離感に）、
	 * volume は倍率（0〜1 で小さく）。
	 */
	se(name: string, opt?: { pan?: number; volume?: number }): void;
	/**
	 * レコード再生演出（回転ノイズSE → 音声つき朗読 → 針の上がる音）。
	 * data/records.ts の定義を再生する共通処理。
	 * opt.trueVoice は終点の一斉再生専用：レコードに trueVoice があれば
	 * 「本人の声」で読む（DESIGN §6）。
	 */
	record(id: string, opt?: { trueVoice?: boolean }): Promise<void>;
	/**
	 * かいいノートに書き留める（DESIGN §6.5）。フラグ `note_<id>` を立て、
	 * 初回だけ小さなトーストを出す。すでに書き留めてあれば何もしない。
	 */
	note(id: string): Promise<void>;
	flag(name: string): number | boolean | string | undefined;
	set(name: string, value?: number | boolean | string): void;
	/** マップ移動。 */
	warp(
		mapId: string,
		x: number,
		y: number,
		dir?: Dir,
		opt?: { fade?: boolean; se?: string },
	): Promise<void>;
	/**
	 * 歩かせる。target は "player" かイベント ID。
	 * route は "uuddlr" のような文字列（u/d/l/r = 1歩, U/D/L/R = その方向を向くだけ, w = 少し待つ）。
	 */
	move(
		target: string,
		route: string,
		opt?: { speed?: number; through?: boolean },
	): Promise<void>;
	face(target: string, dir: Dir | "player"): void;
	/** イベントを出す／消す（マップ上の見た目。フラグで管理されセーブされる）。 */
	show(eventId: string): void;
	hide(eventId: string): void;
	/** イベントの位置を変える（見た目だけ。マップを出ると元に戻る）。 */
	place(eventId: string, x: number, y: number, dir?: Dir): void;
	give(itemId: string, n?: number): void;
	take(itemId: string, n?: number): boolean;
	has(itemId: string): number;
	shake(ms?: number): Promise<void>;
	flash(color?: string, ms?: number): Promise<void>;
	/** 章タイトルを出す。 */
	chapter(label: string, title: string): Promise<void>;
	/** セーブ画面（はい／いいえ）。 */
	saveMenu(): Promise<void>;
	/** エンディング（スタッフロール → まとめカード → おわり → タイトルへ）。 */
	ending(opt?: { summary?: EndingSummary }): Promise<void>;
};
