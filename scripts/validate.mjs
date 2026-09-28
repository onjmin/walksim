// ゲームデータの検証（pnpm validate）。
//
// Vite の SSR で src/data/index.ts を読み込み、次を調べる。
// - マップ: 行の長さがそろっているか、未定義のタイル文字、イベントの座標・重複、BGM 名
// - レコード（data/records.ts）: 声の音源（voice / trueVoice）・日付・本文の長さ、items への登録
// - かいいノート（data/notes.ts）: 本文の行数・長さ。s.note(id) の id が notes に有るか。
//   どこからも呼ばれていないノートは警告（1つにまとめて出す）
// - イベントのスクリプトを「何もしない Story」で実際に走らせ、呼ばれた命令を調べる
//   （話し手・道具・BGM・効果音・ワープ先・レコード・セリフの長さ）
//   フラグ2通り（空・すべて立っている）× 選び方（pick 0〜4）で走らせ、
//   さらに、読んだフラグを1つずつ反転させて走らせ直し、分岐の先もなるべく通す。
//   選択肢は、固定の pick のほかに、選び方の組み合わせを幅優先でたどる（1組 MAX_PATHS 本まで）。
//   2周目は、ほかのスクリプトが set した値（文字列・数）をフラグに入れて走らせる。
// - フラグの約束（DESIGN §7）: スクリプトが set するフラグが、決めた接頭辞・名前に収まっているか
// - 到達性: 入口（warp の着地点・開始位置など）から歩いて、talk イベントを向いて調べられるか
//   （背の高い物の裏・カウンター越しは engine と同じ規則。くわしくは下の「到達性」）
// エラーがあれば終了コード 1。

import { readFileSync } from "node:fs";
import { createServer } from "vite";

const MAX_COLS = 22; // 1行あたりの全角文字数の目安
const MAX_LINES = 2;
// 選択肢の全角文字数。375px 幅のスマホ縦で1行に収まる幅（.choice の max-width 80vw・
// .choice-item の 17px と余白から、文字の入る幅は 約240px＝全角14字）
const MAX_CHOICE = 14;
const MAX_SUMMARY_LINES = 10; // まとめカードの1セクションの行数
const PICKS = [0, 1, 2, 3, 4]; // choose が返す番号（選択肢が少なければ最後のもの）
const MAX_FLIPS = 48; // 1本のスクリプトで反転させて走らせ直すフラグの数
const MAX_PATHS = 48; // 選び方の組み合わせをたどる本数（フラグ1組あたり）
const TYPED = 4; // 2周目（set された値を入れる）のフラグの組の数
const MENU_REPEAT = 12; // 同じ選択肢がこれ以上出たら、やめる側（cancel か最後）を選ぶ
// 読み上げの音源（engine/audio.ts の CORE_VOICE_MODELS + CAMEO_VOICE_MODELS と合わせる。
// 春音リノの現行版キーワードは rino121。カメオ5音源は終盤専用＝records の trueVoice 等）
const VOICE_MODELS = [
	"uc",
	"roze",
	"rei",
	"tsukuyomi",
	"rino121",
	"teto",
	"shiyo",
	"hibika_aru",
	"ruko_male",
	"ruko_female",
	"mgroid",
	"motroid",
	"nynroid",
];
// フラグの約束（DESIGN §7）。スクリプトが set するフラグは、この形に収める。
// done:/hide: はエンジン、seen_ は目撃、got_ は入手、rule_/note_/found_ はワールドの発見。
// tod は時間帯（DESIGN §4: "yu"|"yoru"|"shinya"|"asa"）。
const FLAG_OK =
	/^(done:|hide:|seen_|got_|rule_|note_|found_|gate_open$|clear$|ending_ready$|ending_seen$|keep_clear$|flashlight$|debug$|tod$)/;
// 到達性の検査から外す talk イベント（"マップ イベントid" → 理由）。
// わざと歩いて行けない場所に置いたものだけを、理由を書いて足す。
// 無いイベント・歩いて調べられるようになったものは警告する（消し忘れ防止）。
const REACH_OK = {
	// village.ts「八尺様（遠景。…話しかけられる距離には来ない）」
	"village hass1": "八尺様①は田の向こうの遠景",
	"village hass3": "八尺様③は用水路の向こうの遠景",
	// kakolog2.ts「ムッジェ（柵の向こうの赤い気配。近づくと一度だけ声）」
	"kakolog2 mujje": "柵のむこうの気配。声は柵の手前の帯 mujje_tr_* が出す",
};

const server = await createServer({
	server: { middlewareMode: true, hmr: false, ws: false },
	appType: "custom",
	logLevel: "error",
	optimizeDeps: { noDiscovery: true, include: [] },
});

/**
 * engine/assets.ts の画像読み込み（new Image）を Node で動かすための代わり。大きさだけ読む。
 * public/ の PNG は IHDR から幅・高さを読む。CDN の画像（sp: の RPGEN 単体スプライト）は読まず、
 * 読み込み中のままにする（大きさ不明＝overflowsCell は「はみ出さない」。いま使っている sp: はどれも 16x16）。
 */
class NodeImage {
	width = 0;
	height = 0;
	onload = null;
	onerror = null;
	set src(url) {
		const base = server.config.base;
		if (!url.startsWith(base)) return;
		try {
			const file = new URL(
				`../public/${url.slice(base.length)}`,
				import.meta.url,
			);
			const png = readFileSync(file);
			this.width = png.readUInt32BE(16);
			this.height = png.readUInt32BE(20);
			queueMicrotask(() => this.onload?.());
		} catch {
			queueMicrotask(() => this.onerror?.());
		}
	}
}
globalThis.Image ??= NodeImage;

// 同じ警告・エラーは1回だけ出す（note は最初の1回の例として添える）
const errors = new Map();
const warns = new Map();
const add = (bag, m, note) => {
	if (!bag.has(m)) bag.set(m, note ? `${m}（例: ${note}）` : m);
};
const err = (m, note) => add(errors, m, note);
const warn = (m, note) => add(warns, m, note);

// 全角換算の幅（半角英数・半角カナは 0.5）
const width = (line) =>
	[...line].reduce((w, ch) => w + (/[\x20-\x7e｡-ﾟ]/.test(ch) ? 0.5 : 1), 0);
const oneLine = (text) => text.replace(/\n/g, "⏎");

const checkText = (where, text, note) => {
	if (typeof text !== "string") return;
	const lines = text.split("\n");
	if (lines.length > MAX_LINES)
		warn(
			`${where}: セリフが ${lines.length} 行（${MAX_LINES} 行まで）: ${oneLine(text)}`,
			note,
		);
	for (const l of lines)
		if (width(l) > MAX_COLS)
			warn(`${where}: 1行が長い（${width(l)}字）: ${l}`, note);
};

/** 組み立てた文に、値の入れまちがい（undefined・NaN など）が無いか。 */
const checkValue = (where, text, note) => {
	if (
		typeof text === "string" &&
		/undefined|NaN|\[object |null|true|false/.test(text)
	)
		err(`${where}: 文に変な値が入っている: ${oneLine(text)}`, note);
};

/** まとめカード（EndingSummary）の形と長さ。 */
const checkSummary = (where, summary, note) => {
	if (!summary || !Array.isArray(summary.sections)) {
		err(`${where}: まとめの形が変（{ sections: [...] } ではない）`, note);
		return;
	}
	for (const sec of summary.sections) {
		if (typeof sec?.title !== "string" || !Array.isArray(sec?.lines)) {
			err(
				`${where}: まとめのセクションの形が変（{ title, lines } ではない）`,
				note,
			);
			continue;
		}
		if (width(sec.title) > MAX_COLS)
			warn(
				`${where}: まとめの見出しが長い（${width(sec.title)}字）: ${sec.title}`,
				note,
			);
		if (sec.lines.length > MAX_SUMMARY_LINES)
			warn(
				`${where}: まとめ「${sec.title}」が ${sec.lines.length} 行（${MAX_SUMMARY_LINES} 行まで）`,
				note,
			);
		checkValue(where, sec.title, note);
		for (const l of sec.lines) {
			if (typeof l !== "string") {
				err(
					`${where}: まとめ「${sec.title}」の行が文字列でない: ${String(l)}`,
					note,
				);
				continue;
			}
			if (l.includes("\n"))
				warn(`${where}: まとめの行に改行がある: ${oneLine(l)}`, note);
			if (width(l) > MAX_COLS)
				warn(`${where}: まとめの1行が長い（${width(l)}字）: ${l}`, note);
			checkValue(where, l, note);
		}
	}
};

const realRandom = Math.random;
const t0 = performance.now();
let runs = 0;
let scripts = 0;

try {
	const { data } = await server.ssrLoadModule("/src/data/index.ts");
	const maps = data.maps;

	// ── マップの形 ──
	const grids = {};
	for (const [id, m] of Object.entries(maps)) {
		if (m.id !== id) err(`map ${id}: id が "${m.id}" になっている`);
		const lens = m.rows.map((r) => [...r].length);
		const w = Math.max(...lens);
		lens.forEach((l, y) => {
			if (l !== w) err(`map ${id}: ${y} 行目の長さが ${l}（ほかは ${w}）`);
		});
		const grid = m.rows.map((r) => [...r]);
		grids[id] = { w, h: m.rows.length, grid };
		const unknown = new Set();
		for (const row of grid)
			for (const ch of row) if (!m.tiles[ch]) unknown.add(ch);
		if (unknown.size)
			err(
				`map ${id}: 未定義のタイル文字 ${[...unknown].map((c) => JSON.stringify(c)).join(" ")}`,
			);
		const seen = new Set();
		for (const e of m.events ?? []) {
			if (seen.has(e.id)) err(`map ${id}: イベント id "${e.id}" が重複`);
			seen.add(e.id);
			if (e.x < 0 || e.y < 0 || e.x >= w || e.y >= m.rows.length)
				err(`map ${id}: イベント ${e.id} (${e.x},${e.y}) がマップの外`);
			if (e.trigger === "auto" && !e.once)
				warn(
					`map ${id}: auto イベント ${e.id} に once が無い（無限ループのおそれ）`,
				);
			if (e.trigger === "touch" && e.sprite && !e.through)
				warn(
					`map ${id}: touch イベント ${e.id} が見た目つきで通れない（踏めない）`,
				);
			if (e.sprite?.startsWith("char:") && !data.cast[e.sprite.slice(5)])
				err(
					`map ${id}: イベント ${e.id} の見た目 "${e.sprite}" が cast に無い`,
				);
		}
		if (m.bgm === "@tod") {
			for (const [tod, name] of Object.entries(data.todBgm ?? {}))
				if (!data.bgm[name]) err(`todBgm.${tod}: BGM "${name}" が無い`);
			for (const [tod, name] of Object.entries(m.todBgm ?? {})) {
				if (!(tod in (data.todBgm ?? {})))
					err(`map ${id}: todBgm の時間帯 "${tod}" が GameData.todBgm に無い`);
				if (!data.bgm[name]) err(`map ${id}: todBgm.${tod} の BGM "${name}" が無い`);
			}
		} else if (m.bgm && !data.bgm[m.bgm]) err(`map ${id}: BGM "${m.bgm}" が無い`);
		if (m.todBgm && m.bgm !== "@tod")
			err(`map ${id}: todBgm は bgm が "@tod" の地区でしか使えない`);
		if (m.dark !== undefined && !(m.dark >= 0 && m.dark <= 1))
			err(`map ${id}: dark が 0〜1 でない: ${m.dark}`);
	}

	const passable = (mapId, x, y) => {
		const g = grids[mapId];
		if (!g || x < 0 || y < 0 || x >= g.w || y >= g.h) return false;
		return !!maps[mapId].tiles[g.grid[y][x]]?.passable;
	};

	// ── キャラ（声の音源・立ち絵の側） ──
	for (const [id, c] of Object.entries(data.cast)) {
		if (c.id !== id) err(`cast ${id}: id が "${c.id}" になっている`);
		if (c.voice && !VOICE_MODELS.includes(c.voice.model))
			err(
				`cast ${id}: 声の音源 "${c.voice.model}" が prepareSpeech（${VOICE_MODELS.join("・")}）に無い`,
			);
	}

	// ── レコード（data/records.ts） ──
	for (const [id, r] of Object.entries(data.records)) {
		if (r.id !== id) err(`record ${id}: id が "${r.id}" になっている`);
		if (!data.items[id])
			err(`record ${id}: 同じ id の大事なもの（items）が無い`);
		if (r.voice && !VOICE_MODELS.includes(r.voice.model))
			err(
				`record ${id}: 声の音源 "${r.voice.model}" が prepareSpeech（${VOICE_MODELS.join("・")}）に無い`,
			);
		if (r.trueVoice && !VOICE_MODELS.includes(r.trueVoice.model))
			err(
				`record ${id}: 本人の声 "${r.trueVoice.model}" が prepareSpeech（${VOICE_MODELS.join("・")}）に無い`,
			);
		if (typeof r.date !== "string" || !r.date)
			err(`record ${id}: 日付（date）が無い`);
		if (!Array.isArray(r.lines) || !r.lines.length)
			err(`record ${id}: 本文（lines）が空`);
		for (const l of r.lines ?? []) checkText(`record ${id}`, l);
		if (width(r.title) > MAX_COLS)
			warn(`record ${id}: 題名が長い（${width(r.title)}字）: ${r.title}`);
	}

	// ── アイテム（desc もメッセージ窓の幅で見る） ──
	for (const [id, it] of Object.entries(data.items)) {
		if (it.id !== id) err(`item ${id}: id が "${it.id}" になっている`);
		checkText(`item ${id} desc`, it.desc);
	}

	// ── かいいノート（data/notes.ts。DESIGN §6.5：1行 全角22字・2〜4行） ──
	for (const [id, nd] of Object.entries(data.notes ?? {})) {
		if (nd.id !== id) err(`note ${id}: id が "${nd.id}" になっている`);
		if (!Array.isArray(nd.lines) || !nd.lines.length)
			err(`note ${id}: 本文（lines）が空`);
		if ((nd.lines ?? []).length > 4)
			warn(`note ${id}: 本文が ${nd.lines.length} 行（4 行まで）`);
		for (const l of nd.lines ?? []) {
			if (typeof l !== "string") {
				err(`note ${id}: 行が文字列でない: ${String(l)}`);
				continue;
			}
			if (l.includes("\n"))
				warn(`note ${id}: 行に改行がある（1要素 = 1行）: ${oneLine(l)}`);
			if (width(l) > MAX_COLS)
				warn(`note ${id}: 1行が長い（${width(l)}字）: ${l}`);
			checkValue(`note ${id}`, l);
		}
		if (width(nd.title) > MAX_COLS)
			warn(`note ${id}: 見出しが長い（${width(nd.title)}字）: ${nd.title}`);
		if (nd.hint !== undefined && width(nd.hint) > MAX_COLS)
			warn(`note ${id}: ヒントが長い（${width(nd.hint)}字）: ${nd.hint}`);
	}

	// ── スクリプトを走らせる ──
	/** スクリプトの set で立ったフラグ（名前 → 値の集合）。フラグの約束の検査に使う。 */
	const setFlags = new Map();
	/** s.note() で書き留められたノート id（呼ばれていないノートの警告に使う）。 */
	const usedNotes = new Set();
	/** 2周目で入れる値（フラグ名 → 1周目にスクリプトが set した文字列・数）。 */
	const typedDomain = new Map();
	/** warp の着地点（マップ id → "x,y" の集合）。到達性の入口に使う。 */
	const landings = new Map();
	/** warp を呼んだことのあるスクリプト（where）。踏むと飛ばされるタッチイベントの判定に使う。 */
	const warpers = new Set();
	/** 2周目の組 i で、フラグ k に入れる値（set されたことのない真偽のフラグは true）。 */
	const typedOf = (k, i) => {
		const vals = typedDomain.get(k) ?? null;
		return vals?.length ? vals[i % vals.length] : true;
	};

	/**
	 * 走らせるときのフラグ。base "none" は何も立っていない、"all" はすべて true、
	 * 数 i は2周目の組（すべて立っていて、set された値のあるフラグはその値。typedOf）。
	 * flip のフラグだけ反対にする。reads には「最初から入っていた値」を読んだフラグ名をためる。
	 */
	const makeFlags = (base, flip, reads) =>
		new Proxy(
			{},
			{
				get: (t, k) => {
					if (typeof k !== "string" || Object.hasOwn(t, k) || k in t)
						return t[k];
					reads?.add(k);
					if (base === "none") return k === flip ? true : undefined;
					if (k === flip) return undefined;
					return base === "all" ? true : typedOf(k, base);
				},
				set: (t, k, v) => {
					t[k] = v;
					return true;
				},
			},
		);

	const makeStory = (where, flags, mapId, ctx) => {
		// 仮の現在地はそのマップの最初の通れるマス（開始マップなら開始位置）。ワープすると移る
		const firstPassable = (id) => {
			const g = grids[id];
			for (let y = 0; y < g.h; y++)
				for (let x = 0; x < g.w; x++) if (passable(id, x, y)) return { x, y };
			return { x: 0, y: 0 };
		};
		const pos =
			mapId === data.start.mapId
				? { x: data.start.x, y: data.start.y }
				: firstPassable(mapId);
		const state = {
			mapId,
			x: pos.x,
			y: pos.y,
			dir: "down",
			flags,
			items: {},
			playMs: 0,
		};
		const here = () => maps[state.mapId];
		const note = ctx.note;
		let steps = 0;
		const tick = () => {
			if (++steps > 2000) throw new Error("命令が多すぎる（無限ループ？）");
		};
		const s = {
			get state() {
				return state;
			},
			say: async (who, text) => {
				tick();
				if (who && !data.cast[who])
					err(`${where}: 話し手 "${who}" が cast に無い`, note);
				checkText(where, text, note);
				checkValue(where, text, note);
			},
			narrate: async (text) => {
				tick();
				checkText(where, text, note);
				checkValue(where, text, note);
			},
			choose: async (options, opt) => {
				tick();
				for (const o of options) {
					if (width(o) > MAX_CHOICE) warn(`${where}: 選択肢が長い: ${o}`, note);
					checkValue(where, o, note);
				}
				const n = options.length;
				if (!n) {
					err(`${where}: 選択肢が空`, note);
					return 0;
				}
				ctx.maxN = Math.max(ctx.maxN, n);
				// 同じメニューが何度も出るときは、やめる側を選んで抜ける（選び方を固定しているため）
				const sig = options.join("\u0000");
				const rep = (ctx.menus.get(sig) ?? 0) + 1;
				ctx.menus.set(sig, rep);
				let i;
				if (rep > MENU_REPEAT) {
					i = opt?.cancel ?? n - 1;
					ctx.counts.push(1); // ここは分けない
				} else if (ctx.path) {
					// 組み合わせをたどる：道の途中は決まった番号、その先は 0
					const k = ctx.taken.length;
					i = k < ctx.path.length ? Math.min(ctx.path[k], n - 1) : 0;
					ctx.counts.push(n);
				} else {
					i = Math.min(ctx.pick, n - 1);
					ctx.counts.push(n);
				}
				ctx.taken.push(i);
				return i;
			},
			wait: async () => tick(),
			fadeOut: async () => tick(),
			fadeIn: async () => tick(),
			bgm: (name) => {
				if (name !== null && !data.bgm[name])
					err(`${where}: BGM "${name}" が無い`, note);
			},
			se: (name, opt) => {
				if (!data.sfx[name]) err(`${where}: 効果音 "${name}" が無い`, note);
				if (opt?.pan !== undefined && !(opt.pan >= -1 && opt.pan <= 1))
					err(`${where}: 効果音 "${name}" の pan が -1〜1 でない`, note);
				if (opt?.volume !== undefined && !(opt.volume >= 0 && opt.volume <= 1))
					err(`${where}: 効果音 "${name}" の volume が 0〜1 でない`, note);
			},
			record: async (id) => {
				tick();
				if (!data.records[id])
					err(`${where}: レコード "${id}" が records に無い`, note);
			},
			note: async (id) => {
				tick();
				usedNotes.add(id);
				if (!data.notes[id])
					err(`${where}: ノート "${id}" が notes に無い`, note);
				// 本物と同じくフラグ note_<id> を立てる（when・考察会話の分岐に効く）
				flags[`note_${id}`] = true;
			},
			flag: (name) => flags[name],
			set: (name, value = true) => {
				flags[name] = value;
				let vs = setFlags.get(name);
				if (!vs) {
					vs = new Set();
					setFlags.set(name, vs);
				}
				if (vs.size < 64) vs.add(value);
			},
			warp: async (to, x, y, _dir, opt) => {
				tick();
				warpers.add(where);
				if (opt?.se && !data.sfx[opt.se])
					err(`${where}: ワープの効果音 "${opt.se}" が無い`, note);
				if (!maps[to]) err(`${where}: ワープ先のマップ "${to}" が無い`, note);
				else {
					if (!passable(to, x, y))
						err(`${where}: ワープ先 ${to} (${x},${y}) が通れないマス`, note);
					// デバッグルームの近道（debug.ts の cp_*）の着地点は、到達性の入口に数えない
					// （本物の出入口が無くなっても、近道の着地点から「歩いて行ける」ことになってしまう）
					if (!where.startsWith("map debug ")) {
						if (!landings.has(to)) landings.set(to, new Set());
						landings.get(to).add(`${x},${y}`);
					}
					state.mapId = to;
					state.x = x;
					state.y = y;
				}
			},
			move: async (target, route) => {
				tick();
				if (typeof route !== "string" || /[^udlrUDLRw]/.test(route))
					err(`${where}: move の道順 "${route}" が変`, note);
				if (
					target !== "player" &&
					!(here().events ?? []).some((e) => e.id === target)
				)
					err(
						`${where}: move の相手 "${target}" がこのマップのイベントに無い`,
						note,
					);
			},
			face: (target) => {
				if (
					target !== "player" &&
					!(here().events ?? []).some((e) => e.id === target)
				)
					err(
						`${where}: face の相手 "${target}" がこのマップのイベントに無い`,
						note,
					);
			},
			show: (id) => {
				if (!(here().events ?? []).some((e) => e.id === id))
					err(`${where}: show の "${id}" がこのマップのイベントに無い`, note);
			},
			hide: (id) => {
				if (!(here().events ?? []).some((e) => e.id === id))
					err(`${where}: hide の "${id}" がこのマップのイベントに無い`, note);
			},
			place: (id, x, y) => {
				if (id !== "player" && !(here().events ?? []).some((e) => e.id === id))
					err(`${where}: place の "${id}" がこのマップのイベントに無い`, note);
				const g = grids[state.mapId];
				if (x < 0 || y < 0 || x >= g.w || y >= g.h)
					err(`${where}: place の座標 (${x},${y}) がマップの外`, note);
			},
			give: (id) => {
				if (!data.items[id]) err(`${where}: 道具 "${id}" が無い`, note);
				state.items[id] = (state.items[id] ?? 0) + 1;
			},
			take: (id) => {
				if (!data.items[id]) err(`${where}: 道具 "${id}" が無い`, note);
				return true;
			},
			has: (id) => {
				if (!data.items[id]) err(`${where}: 道具 "${id}" が無い`, note);
				return 1;
			},
			shake: async () => {},
			flash: async () => {},
			chapter: async () => tick(),
			saveMenu: async () => {},
			ending: async (opt) => {
				tick();
				if (opt?.summary !== undefined)
					checkSummary(`${where} ending`, opt.summary, note);
			},
		};
		return s;
	};

	/**
	 * 1回走らせる。Math.random は pick で決まる値にする（行き先の固定）。
	 * path があれば、choose は path の番号を順に返す（その先は 0。選び方の組み合わせをたどる）。
	 */
	const runOnce = async (where, fn, mapId, flags, pick, label, path = null) => {
		const ctx = {
			pick,
			path,
			taken: [],
			counts: [],
			maxN: 0,
			random: false,
			menus: new Map(),
			note: path
				? `${label} path=[${path.join(",")}]`
				: `${label} pick=${pick}`,
		};
		Math.random = () => {
			ctx.random = true;
			return ((pick + 0.5) / 5) % 1;
		};
		runs++;
		try {
			await fn(makeStory(where, flags, mapId, ctx));
		} catch (e) {
			err(`${where}: スクリプトが例外: ${e?.message ?? e}`, ctx.note);
		} finally {
			Math.random = realRandom;
		}
		return ctx;
	};

	/** 選び方（pick 0〜4）を変えて走らせる。結果が変わらない組み合わせは飛ばす。 */
	const runVariants = async (where, fn, mapId, mkFlags, label) => {
		let maxAll = 0;
		for (const pick of PICKS) {
			const a = await runOnce(where, fn, mapId, mkFlags(), pick, label);
			maxAll = Math.max(maxAll, a.maxN);
			if (!a.random && a.maxN - 1 <= pick) break;
		}
		// 選択肢が2つ以上あれば、選び方の組み合わせもたどる（pick を固定すると通らない入れ子の選択）
		if (maxAll > 1) await explore(where, fn, mapId, mkFlags, label);
	};

	/**
	 * 選び方の組み合わせを幅優先でたどる（浅い選択のちがいから先に。MAX_PATHS 本まで）。
	 * 1本走らせるごとに、道の先で出た選択肢の「ほかの番号」を次の道として積む。
	 */
	const explore = async (where, fn, mapId, mkFlags, label) => {
		const queue = [[]];
		for (let n = 0; n < MAX_PATHS && queue.length; n++) {
			const path = queue.shift();
			const ctx = await runOnce(where, fn, mapId, mkFlags(), 0, label, path);
			for (let k = path.length; k < ctx.counts.length; k++)
				for (let j = 1; j < ctx.counts[k]; j++)
					queue.push([...ctx.taken.slice(0, k), j]);
		}
	};

	/** フラグの組 base で走らせ、読んだフラグを1つずつ反転させて走らせ直す（ほかの分岐の先も通す）。 */
	const runBase = async (where, fn, mapId, base) => {
		const tag = typeof base === "number" ? `typed${base}` : base;
		const reads = new Set();
		await runVariants(
			where,
			fn,
			mapId,
			() => makeFlags(base, null, reads),
			`flags=${tag}`,
		);
		for (const k of [...reads].slice(0, MAX_FLIPS))
			await runVariants(
				where,
				fn,
				mapId,
				() => makeFlags(base, k, null),
				`flags=${tag} ${base === "none" ? "+" : "-"}${k}`,
			);
	};

	/** 走らせたスクリプト（2周目にもう一度走らせる）。 */
	const jobs = [];
	const run = async (where, fn, mapId) => {
		scripts++;
		jobs.push([where, fn, mapId]);
		for (const base of ["none", "all"]) await runBase(where, fn, mapId, base);
	};

	/** when を評価する（例外が出ないか）。where は「map hub gate」のような名前。 */
	const checkWhen = (where, when, mapId, flags) => {
		try {
			when({ flags, items: {}, mapId, x: 0, y: 0, dir: "down", playMs: 0 });
		} catch (ex) {
			err(`${where}: when が例外: ${ex?.message ?? ex}`);
		}
	};

	// when の検査用（空・すべて立っている）
	const whenFlagSets = () => [{}, makeFlags("all", null, null)];

	for (const [id, m] of Object.entries(maps)) {
		if (m.onEnter) await run(`map ${id} onEnter`, m.onEnter, id);
		for (const e of m.events ?? []) {
			if (e.when)
				for (const flags of whenFlagSets())
					checkWhen(`map ${id} ${e.id}`, e.when, id, flags);
			if (e.run) await run(`map ${id} ${e.id}`, e.run, id);
		}
	}

	// ── 2周目：1周目にスクリプトが set した値（文字列・数）をフラグに入れて、もう一度走らせる ──
	for (const [k, vs] of setFlags) {
		const typed = [...vs].filter(
			(v) => typeof v === "string" || typeof v === "number",
		);
		if (typed.length) typedDomain.set(k, typed);
	}
	for (let i = 0; i < TYPED; i++) {
		const flags = makeFlags(i, null, null);
		for (const [id, m] of Object.entries(maps))
			for (const e of m.events ?? [])
				if (e.when) checkWhen(`map ${id} ${e.id}`, e.when, id, flags);
	}
	for (const [where, fn, mapId] of jobs)
		for (let i = 0; i < TYPED; i++) await runBase(where, fn, mapId, i);

	// ── どこからも s.note() されていないノート（未実装の呼び出し箇所。警告のみ） ──
	const unusedNotes = Object.keys(data.notes ?? {}).filter(
		(id) => !usedNotes.has(id),
	);
	if (unusedNotes.length)
		warn(`ノート: どこからも s.note() されていない: ${unusedNotes.join("・")}`);

	// ── フラグの約束（DESIGN §7）：スクリプトが set するフラグの形 ──
	for (const k of setFlags.keys())
		if (!FLAG_OK.test(k))
			warn(
				`フラグの約束: "${k}" が決めた形（done:/hide:/seen_/got_/rule_/note_/found_/gate_open/clear/ending_ready/ending_seen/keep_clear/flashlight/tod）に無い`,
			);

	// ── 開始位置・デバッグルーム ──
	const st = data.start;
	if (!maps[st.mapId]) err(`start: マップ "${st.mapId}" が無い`);
	else if (!passable(st.mapId, st.x, st.y))
		err(`start: 開始位置 ${st.mapId} (${st.x},${st.y}) が通れない`);
	if (data.debug) {
		const d = data.debug;
		if (!maps[d.mapId]) err(`debug: マップ "${d.mapId}" が無い`);
		else if (!passable(d.mapId, d.x, d.y))
			err(`debug: 開始位置 ${d.mapId} (${d.x},${d.y}) が通れない`);
	}
	if (!data.bgm[data.titleBgm]) err(`titleBgm "${data.titleBgm}" が無い`);
	if (!data.bgm[data.endingBgm]) err(`endingBgm "${data.endingBgm}" が無い`);

	// ── 到達性：入口から歩いて、talk イベントを向いて調べられるか ──
	// 入口は、スクリプトの warp の着地点（上で走らせたときに集めた。デバッグルームの近道の着地点は除く）・
	// 開始位置・デバッグルームの入口・
	// メニューの「めをさます」（ui/menu.ts が room (2,4) へ送る。スクリプトの外なのでここで足す）。
	// 入口から、通れる地形を幅優先でたどる。人・置物は engine の Actor と同じく
	// 「見た目があって through でない」ものが塞ぐ。warp を呼ぶタッチイベントのマスは、踏んだら
	// 飛ばされるので、そこで止まる（その先へは進めず、そこに立って調べることもできない）。
	// 調べ方は engine/game.ts の talkFront と同じ: となりのマスから、そちらを向いて調べる。
	// 背の高い物（engine/field.ts の hasBack）は、北どなりから下向きには調べられない。
	// 目の前がカウンター（tile.counter）でそこに talk イベントが無ければ、その向こうまで届く。
	// when は時間帯ごとに分けず、いちばん歩きやすい形で見る: when・once のあるもの（出たり消えたり
	// するもの）とうろうろ歩く人は、塞がない・飛ばさない・カウンターを遮らないとみなす。
	// 調べる側の talk イベントは、when があっても（いつか出るものとして）すべて調べる。
	// 見ないもの: when で時間帯ごとに出る人による塞がり（例: 朝の street の男の子 (14,10) が
	// 電器屋のはり紙 (14,9) の前に立つ）と、warp 以外の touch の帯を踏めるかどうか。
	const { Actor, Field } = await server.ssrLoadModule("/src/engine/field.ts");
	const { preloadImages } = await server.ssrLoadModule("/src/engine/assets.ts");
	const spriteOf = (ref) =>
		ref?.startsWith("char:") ? (data.cast[ref.slice(5)]?.walk ?? "") : ref;
	// hasBack が大きさを見る画像（切り出し指定の無い public/ の画像）を先に読んでおく
	const refs = new Set();
	for (const m of Object.values(maps)) {
		for (const t of Object.values(m.tiles))
			for (const r of [...t.layers, ...(t.above ?? [])]) refs.add(r);
		for (const e of m.events ?? []) if (e.sprite) refs.add(spriteOf(e.sprite));
	}
	await preloadImages(
		[...refs].filter((r) => r?.startsWith("pub:") && !r.includes("#")),
	);
	const DIRS = [
		[0, -1, "up"],
		[1, 0, "right"],
		[0, 1, "down"],
		[-1, 0, "left"],
	];
	const entries = new Map(landings);
	const addEntry = (mapId, x, y) => {
		if (!entries.has(mapId)) entries.set(mapId, new Set());
		entries.get(mapId).add(`${x},${y}`);
	};
	addEntry(st.mapId, st.x, st.y);
	if (data.debug) addEntry(data.debug.mapId, data.debug.x, data.debug.y);
	addEntry("room", 2, 4); // ui/menu.ts「めをさます」
	for (const [id, m] of Object.entries(maps)) {
		const g = grids[id];
		const inside = (x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h;
		const key = (x, y) => y * g.w + x;
		const field = {
			tileAt: (x, y) =>
				(inside(x, y) && m.tiles[g.grid[y][x]]) || {
					layers: [],
					passable: false,
				},
		};
		const events = m.events ?? [];
		/** 塞ぐマス（いつもそこにいる、見た目つきの通れない人・置物）。 */
		const blocked = new Set();
		/** 踏むと飛ばされるマス（いつもある、warp を呼ぶタッチイベント）。 */
		const stops = new Set();
		/** いつもそこにいる talk イベントのマス（カウンターの上なら、カウンター越しの調べを遮る）。 */
		const talkAlways = new Set();
		for (const e of events) {
			if (e.when || e.once) continue;
			const sprite = spriteOf(e.sprite) ?? "";
			if (!e.wander && !(e.through ?? !sprite)) blocked.add(key(e.x, e.y));
			if (e.trigger === "touch" && warpers.has(`map ${id} ${e.id}`))
				stops.add(key(e.x, e.y));
			if (e.trigger === "talk") talkAlways.add(key(e.x, e.y));
		}
		const starts = [...(entries.get(id) ?? [])].map((p) =>
			p.split(",").map(Number),
		);
		const talks = events.filter((e) => e.trigger === "talk" && e.run);
		if (!starts.length) {
			if (talks.length)
				err(
					`map ${id}: 到達性: 入口が無い（どこからも warp されていない・開始位置でもない）`,
				);
			continue;
		}
		// 入口から歩いて立てるマス
		const stand = new Set();
		const seen = new Set();
		const queue = [];
		for (const [x, y] of starts) {
			seen.add(key(x, y));
			queue.push([x, y, true]);
		}
		for (let head = 0; head < queue.length; head++) {
			const [x, y, entry] = queue[head];
			if (!entry && stops.has(key(x, y))) continue; // 踏んだら飛ばされる
			stand.add(key(x, y));
			for (const [dx, dy] of DIRS) {
				const nx = x + dx;
				const ny = y + dy;
				if (!inside(nx, ny) || seen.has(key(nx, ny))) continue;
				if (!field.tileAt(nx, ny).passable || blocked.has(key(nx, ny)))
					continue;
				seen.add(key(nx, ny));
				queue.push([nx, ny, false]);
			}
		}
		const canStand = (x, y) => inside(x, y) && stand.has(key(x, y));
		for (const e of talks) {
			const actor = new Actor(
				e.id,
				e.x,
				e.y,
				e.dir ?? "down",
				spriteOf(e.sprite) ?? "",
				e,
			);
			const back = Field.prototype.hasBack.call(field, actor);
			const ok = DIRS.some(([dx, dy, dir]) => {
				// となりのマス (px,py) から dir を向いて調べる
				const px = e.x - dx;
				const py = e.y - dy;
				if (canStand(px, py) && !(dir === "down" && back)) return true;
				// カウンター越し（(px,py) がカウンターなら、その手前から）
				return (
					!!field.tileAt(px, py).counter &&
					!talkAlways.has(key(px, py)) &&
					canStand(px - dx, py - dy)
				);
			});
			const allowed = REACH_OK[`${id} ${e.id}`];
			if (ok && allowed)
				warn(
					`到達性: REACH_OK の "${id} ${e.id}" は歩いて調べられる（外してよい）`,
				);
			else if (!ok && !allowed)
				err(
					`map ${id}: 到達性: talk イベント ${e.id} (${e.x},${e.y}) を調べられない（入口から歩いて立てる、そちらを向けるとなりのマスが無い）`,
				);
		}
	}
	for (const k of Object.keys(REACH_OK)) {
		const [mapId, evId] = k.split(" ");
		if (
			!(maps[mapId]?.events ?? []).some(
				(e) => e.id === evId && e.trigger === "talk",
			)
		)
			warn(`到達性: REACH_OK の "${k}" が talk イベントに無い`);
	}
} catch (e) {
	err(`読み込みに失敗: ${e?.stack ?? e}`);
} finally {
	Math.random = realRandom;
	await server.close();
}

for (const w of warns.values()) console.log(`⚠ ${w}`);
for (const e of errors.values()) console.log(`✖ ${e}`);
console.log(
	`\n${errors.size} errors, ${warns.size} warnings（${scripts} scripts, ${runs} runs, ${((performance.now() - t0) / 1000).toFixed(1)}s）`,
);
process.exit(errors.size ? 1 : 0);
