// フィールドのメニュー（Bボタン／☰）：
// レコード・ノート・めをさます（room 以外）・せってい・きろく・タイトルへ（DESIGN §3）。

import type { Game } from "../engine/game";
import { ResetToTitle } from "../engine/game";
import { writeSave } from "../engine/save";
import { saveSettings, settings } from "../engine/settings";
import { el } from "./dom";

type Item = {
	label: string;
	sub?: string;
	/** 2行目の小さい説明（HTML）。選ぶ前に見せたいもの。 */
	desc?: string;
	value: string;
	disabled?: boolean;
};

/** 指でなぞって巻き取れるか（はみ出していて、しかも overflow で巻き取る箱か）。 */
const canScroll = (s: HTMLElement): boolean => {
	if (s.scrollHeight <= s.clientHeight + 1) return false;
	const o = getComputedStyle(s).overflowY;
	return o === "auto" || o === "scroll";
};

/**
 * タップで決める。ふつうは押した瞬間に決まるが、はみ出して巻き取れる一覧では、
 * 指でなぞって巻き取れるよう、ほとんど動かさずに離したときに決める。
 */
export const onTap = (
	b: HTMLElement,
	scroller: HTMLElement,
	fn: () => void,
): void => {
	let from: { id: number; y: number } | null = null;
	b.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (canScroll(scroller)) from = { id: e.pointerId, y: e.clientY };
		else fn();
	});
	b.addEventListener("pointerup", (e) => {
		if (!from || from.id !== e.pointerId) return;
		const moved = Math.abs(e.clientY - from.y);
		from = null;
		if (moved < 10) fn();
	});
	// 巻き取りが始まった（ブラウザに指を取られた）・外へ出たらやめる
	b.addEventListener("pointercancel", () => {
		from = null;
	});
	b.addEventListener("pointerleave", () => {
		from = null;
	});
};

/** 巻き取れる一覧で、カーソルの行が見えるところまで巻き取る（十字キー・キーボード用）。 */
export const keepInView = (scroller: HTMLElement, b: HTMLElement): void => {
	const r = b.getBoundingClientRect();
	const s = scroller.getBoundingClientRect();
	if (r.top < s.top) scroller.scrollTop -= s.top - r.top;
	else if (r.bottom > s.bottom) scroller.scrollTop += r.bottom - s.bottom;
};

/** 縦に並ぶ選択ウィンドウ。B で null。 */
export const listWindow = (
	game: Game,
	title: string,
	items: Item[],
	opt: { cls?: string; start?: number } = {},
): Promise<string | null> =>
	new Promise((resolve) => {
		const box = el("div", { class: `menu window ${opt.cls ?? ""}` });
		if (title) box.appendChild(el("div", { class: "menu-title", text: title }));
		let cur = Math.min(items.length - 1, Math.max(0, opt.start ?? 0));
		// 選べない行から始めない（最初の A が空振りしないように）
		if (items[cur]?.disabled) {
			const firstOk = items.findIndex((i) => !i.disabled);
			if (firstOk >= 0) cur = firstOk;
		}
		const buttons = items.map((it) => {
			const b = el("button", {
				class: "menu-item",
				html: `<span>${it.label}</span>${it.sub ? `<small>${it.sub}</small>` : ""}${it.desc ? `<span class="desc">${it.desc}</span>` : ""}`,
			});
			if (it.disabled) b.classList.add("disabled");
			if (it.desc) b.classList.add("has-desc");
			onTap(b, box, () => {
				if (!it.disabled) done(it.value);
			});
			box.appendChild(b);
			return b;
		});
		const close = el("button", { class: "menu-close", text: "とじる" });
		onTap(close, box, () => done(null));
		box.appendChild(close);
		const render = () =>
			buttons.forEach((b, i) => {
				b.classList.toggle("cur", i === cur);
				// 先頭の行では見出しごと見せる
				if (i === cur) {
					if (i === 0) box.scrollTop = 0;
					else keepInView(box, b);
				}
			});
		game.ui.appendChild(box);
		render();
		const pop = game.input.push(
			(k) => {
				if (k === "up" || k === "down") {
					if (!items.length) return;
					cur = (cur + (k === "up" ? -1 : 1) + items.length) % items.length;
					game.audio.se("cursor");
					render();
				} else if (k === "a" && items[cur] && !items[cur].disabled) {
					done(items[cur].value);
				} else if (k === "b") {
					done(null);
				}
			},
			{ tap: "b" },
		);
		const done = (v: string | null) => {
			pop();
			game.audio.se(v === null ? "cancel" : "decide");
			box.remove();
			resolve(v);
		};
	});

/** 持っているレコードの一覧。選ぶと Story.record で再生する。 */
const recordMenu = async (game: Game): Promise<void> => {
	const { data, state } = game;
	for (;;) {
		// 持ちもの（items）に入っているレコードだけ並べる
		const owned = Object.values(data.records).filter(
			(r) => (state.items[r.id] ?? 0) > 0,
		);
		if (!owned.length) {
			await game.say(null, "レコードは　まだ　もっていない。");
			game.msg.hideWindow();
			return;
		}
		const v = await listWindow(
			game,
			"レコード",
			owned.map((r) => ({
				label: r.title,
				sub: r.date,
				value: r.id,
			})),
		);
		if (v === null) return;
		await game.story.record(v);
	}
};

/**
 * かいいノート（DESIGN §6.5）。全 NoteDef を定義順に並べ、未発見は「？？？」
 * （hint があれば薄字＝desc で添える）。発見済みを選ぶと本文を読み返せる。
 */
const noteMenu = async (game: Game): Promise<void> => {
	const { data, state } = game;
	const all = Object.values(data.notes);
	let start = 0;
	for (;;) {
		const v = await listWindow(
			game,
			"かいいノート",
			all.map((n) =>
				state.flags[`note_${n.id}`]
					? { label: n.title, value: n.id }
					: { label: "？？？", desc: n.hint, value: n.id, disabled: true },
			),
			{ start },
		);
		if (v === null) return;
		start = all.findIndex((n) => n.id === v);
		const n = data.notes[v];
		if (!n) return;
		// レコード再生と同じく、メッセージ窓で2行ずつ読む（文字だけ。名前欄は見出し）
		for (let i = 0; i < n.lines.length; i += 2)
			await game.msg.show({
				name: `『${n.title}』`,
				text: n.lines.slice(i, i + 2).join("\n"),
				portrait: null,
			});
		game.msg.hideWindow();
	}
};

const voiceLabel = (game: Game) => {
	if (!settings.voice) return "OFF";
	const p = game.audio.voiceProgress;
	if (p && p.total > 0 && p.loaded < p.total)
		return `ON（じゅんび中 ${Math.floor((p.loaded / p.total) * 100)}%）`;
	return "ON";
};

export const settingsMenu = async (game: Game): Promise<void> => {
	let start = 0;
	for (;;) {
		const bgmLabel = { hq: "こうおんしつ", light: "けいりょう", off: "OFF" }[
			settings.bgm
		];
		const speed =
			settings.textMs === 0
				? "しゅんかん"
				: settings.textMs <= 10
					? "はやい"
					: settings.textMs <= 20
						? "ふつう"
						: "おそい";
		const v = await listWindow(
			game,
			"せってい",
			[
				{ label: "ボイス", sub: voiceLabel(game), value: "voice" },
				{
					label: "BGM・効果音",
					sub: settings.mute ? "ミュート中" : "ON",
					value: "mute",
				},
				{ label: "BGMの音", sub: bgmLabel, value: "bgm" },
				{
					label: "BGMの大きさ",
					sub: `${settings.bgmVolume}`,
					value: "bgmVolume",
				},
				{
					label: "効果音の大きさ",
					sub: `${settings.seVolume}`,
					value: "seVolume",
				},
				{
					label: "ボイスの大きさ",
					sub: `${settings.voiceVolume}`,
					value: "voiceVolume",
				},
				{ label: "文字の速さ", sub: speed, value: "text" },
				{
					label: "十字キー",
					sub: settings.pad ? "表示" : "かくす（タップ移動）",
					value: "pad",
				},
			],
			{ start },
		);
		if (v === null) return;
		start = [
			"voice",
			"mute",
			"bgm",
			"bgmVolume",
			"seVolume",
			"voiceVolume",
			"text",
			"pad",
		].indexOf(v);
		/** 0〜100 を 10 刻みの一覧から選ぶ。 */
		const pickVolume = async (
			label: string,
			cur: number,
		): Promise<number | null> => {
			const levels = Array.from({ length: 11 }, (_, i) => i * 10);
			const v = await listWindow(
				game,
				label,
				levels.map((n) => ({
					label: n === 0 ? "0（消す）" : String(n),
					sub: n === cur ? "いま" : undefined,
					value: String(n),
				})),
				{ start: Math.round(cur / 10) },
			);
			return v === null ? null : Number(v);
		};
		if (v === "voice") {
			if (!settings.voice) {
				await game.say(
					null,
					"ボイスを　ONにすると、はじめに　すうじゅうMBの　データを　よみこみます。\n（2回目からは　すぐに　はじまります）",
				);
				const n = await game.story.choose(["ONにする", "やめておく"], {
					cancel: 1,
				});
				game.msg.hideWindow();
				if (n === 0) saveSettings({ voice: true });
			} else {
				saveSettings({ voice: false });
			}
		} else if (v === "mute") saveSettings({ mute: !settings.mute });
		else if (v === "bgm")
			saveSettings({
				bgm:
					settings.bgm === "hq"
						? "light"
						: settings.bgm === "light"
							? "off"
							: "hq",
			});
		else if (v === "bgmVolume") {
			const n = await pickVolume("BGMの大きさ", settings.bgmVolume);
			if (n !== null) saveSettings({ bgmVolume: n });
		} else if (v === "seVolume") {
			const n = await pickVolume("効果音の大きさ", settings.seVolume);
			if (n !== null) saveSettings({ seVolume: n });
		} else if (v === "voiceVolume") {
			const n = await pickVolume("ボイスの大きさ", settings.voiceVolume);
			if (n !== null) saveSettings({ voiceVolume: n });
		} else if (v === "text")
			saveSettings({
				textMs:
					settings.textMs === 0
						? 28
						: settings.textMs > 20
							? 12
							: settings.textMs > 10
								? 7
								: 0,
			});
		else if (v === "pad") saveSettings({ pad: !settings.pad });
	}
};

export const fieldMenu = async (game: Game): Promise<void> => {
	for (;;) {
		const v = await listWindow(
			game,
			"",
			[
				{ label: "レコード", value: "records" },
				{ label: "ノート", value: "notes" },
				// 夢の中（room 以外）でだけ出す安全装置（ゆめにっき9キー相当。DESIGN §3）。
				// 日常パート（夕方・夜）ではまだ夢でないので出さない: tod が深夜のときだけ（DESIGN §4）
				...(game.state.flags.tod === "shinya" && game.state.mapId !== "room"
					? [{ label: "めをさます", value: "wake" }]
					: []),
				{ label: "せってい", value: "settings" },
				{ label: "きろく", sub: "セーブ", value: "save" },
				{ label: "タイトルへ", value: "title" },
			],
			{ cls: "main-menu" },
		);
		if (v === null) return;
		if (v === "records") await recordMenu(game);
		else if (v === "notes") await noteMenu(game);
		else if (v === "wake") {
			await game.say(
				null,
				"めを　さましますか？\n（すすんだ分は　きえません）",
			);
			const n = await game.story.choose(["はい", "いいえ"], { cancel: 1 });
			game.msg.hideWindow();
			if (n === 0) {
				// 自室のベッドで目が覚める（フラグ・持ちものはそのまま）。
				// data.start は夕方の街路（DESIGN §4）なので、行き先はベッドに固定する
				await game.story.warp("room", 2, 4, "down");
				await game.say(null, "……目が　さめた。");
				game.msg.hideWindow();
				return;
			}
		} else if (v === "settings") await settingsMenu(game);
		else if (v === "save") {
			const ok = writeSave(game.state);
			game.audio.se(ok ? "save" : "cancel");
			await game.say(
				null,
				ok
					? "きろくを　のこしました。"
					: "きろくできませんでした……（ブラウザの保存領域が使えないようです）",
			);
			game.msg.hideWindow();
		} else if (v === "title") {
			await game.say(
				null,
				"タイトルへ　もどりますか？\n（きろくしていない　すすみは　きえます）",
			);
			const n = await game.story.choose(["もどる", "やめておく"], {
				cancel: 1,
			});
			game.msg.hideWindow();
			if (n === 0) throw new ResetToTitle();
		}
	}
};
