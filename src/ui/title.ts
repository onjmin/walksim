// タイトル画面 —「夕方の日常」v2（docs/content-briefs.md タイトル画面 v2）。
// v1「深夜の駅名標」は作者却下（怪異を掲げるのは「怪異は日常との差分」の思想に矛盾し、
// 「深夜に駅が現れる」反転のネタバレでもある）。
//
// 夕焼けのグラデーションの空＋電柱と電線のシルエット（商店街の夕方＝原風景）。
// タイトルは控えめな白の文字だけ（プレートなし・発光なし）。画面隅に小さく 17:03。
// 怪異は差分でチラ見せだけ：数十秒に一度、半秒だけ空が深夜色に反転して戻る
// （電線のシルエットはそのまま＝同じ町の別の時間が一瞬さしこむ）。
// ごく稀に題字が1字だけ化けて戻る。それ以外のホラー演出は置かない。
// キリコのシルエットが数十秒に一度ゆっくり横切る（日常の描写として続投）。
// クリア済み（hasClearMark）なら朝：時計 7:00・空が朝の金色・反転も化けも止まる。

import type { GameState } from "../engine/defs";
import { BAYER4, DIORAMA, scenePalette } from "../engine/diorama";
import type { Game } from "../engine/game";
import { hasClearMark, hasSave, readSave } from "../engine/save";
import { drawWalk, stepFrame } from "../engine/sprite";
import { el } from "./dom";
import { listWindow, settingsMenu } from "./menu";

/** 1文字化けの置換表（似た字・濁点の増減・かなの混入だけ。派手にしない）。 */
const GLITCH: Record<string, string> = {
	か: "が",
	し: "じ",
	ち: "ぢ",
	と: "ど",
	キ: "ギ",
	コ: "ゴ",
	リ: "り",
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** 電線のシルエット（たわんだ線を数本。太さは vector-effect で画面幅に依らず一定）。 */
const wiresSvg = (): SVGSVGElement => {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("class", "title-wires");
	svg.setAttribute("viewBox", "0 0 100 60");
	svg.setAttribute("preserveAspectRatio", "none");
	svg.setAttribute("aria-hidden", "true");
	const sags = [
		"M -2 11 Q 30 17 60 12 T 102 15",
		"M -2 15 Q 28 22 58 16 T 102 20",
		"M -2 19 Q 32 26 62 21 T 102 25",
		"M -2 32 Q 50 38 102 24",
	];
	for (const d of sags) {
		const p = document.createElementNS(SVG_NS, "path");
		p.setAttribute("d", d);
		p.setAttribute("vector-effect", "non-scaling-stroke");
		svg.appendChild(p);
	}
	return svg;
};

/** 決定論のノイズ 0..1。 */
const noise = (x: number, y: number): number => {
	let h = (x * 374761393 + y * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/**
 * ジオラマ表示のタイトルの書き割り（ドット絵）。低解像度の画用紙に描いて整数倍で拡大する。
 * 空は場面パレットの段をベイヤーディザでつなぐ。家並み・電柱・電線・歩道・横切るキリコは
 * いちばん暗い段のシルエット。夕（17:03）／深夜の一瞬の反転／朝（クリア後）で パレットだけ替える。
 */
const drawPixelScape = (
	c: HTMLCanvasElement,
	tod: string,
	walker: { x: number; frame: HTMLCanvasElement | null } | null,
): void => {
	const g = c.getContext("2d");
	if (!g) return;
	const W = c.width;
	const H = c.height;
	const { ramp } = scenePalette(tod);
	const img = g.createImageData(W, H);
	const d = img.data;
	const horizon = Math.round(H * 0.7);
	const put = (x: number, y: number, col: [number, number, number]) => {
		if (x < 0 || y < 0 || x >= W || y >= H) return;
		const i = (y * W + x) * 4;
		d[i] = col[0];
		d[i + 1] = col[1];
		d[i + 2] = col[2];
		d[i + 3] = 255;
	};
	const n = ramp.length - 1;
	// 空：上は暗く、地平線に向かって明るく（夕は茜、朝は金）
	for (let y = 0; y < H; y++) {
		const t = Math.min(1, y / horizon);
		const v = 0.6 + t * (n - 1.2);
		for (let x = 0; x < W; x++)
			put(
				x,
				y,
				ramp[Math.max(0, Math.min(n, Math.round(v + BAYER4(x, y) * 0.9)))],
			);
	}
	// 沈む日（地平線の少し上の明るい円と、そのまわりのディザの光）
	const sunX = Math.round(W * 0.68);
	const sunY = horizon - Math.round(H * 0.05);
	const sunR = Math.max(4, Math.round(W * 0.05));
	for (let y = sunY - sunR * 3; y <= sunY + sunR * 3; y++)
		for (let x = sunX - sunR * 3; x <= sunX + sunR * 3; x++) {
			const dd = Math.hypot(x - sunX, y - sunY) / sunR;
			if (dd <= 1) put(x, y, ramp[n]);
			else if (dd < 3 && BAYER4(x, y) + 0.5 < ((3 - dd) / 2) * 0.6)
				put(x, y, ramp[n - 1]);
		}
	const ink = ramp[0];
	const dim = ramp[1];
	// 遠くの家並み（屋根の段々・ところどころ灯った窓）
	let x = 0;
	let k = 0;
	while (x < W) {
		const w = 8 + Math.floor(noise(k, 1) * 14);
		const h = Math.round(H * (0.07 + noise(k, 2) * 0.09));
		const top = horizon - h;
		const gable = noise(k, 3) < 0.5;
		for (let yy = top; yy < horizon; yy++)
			for (let xx = x; xx < Math.min(W, x + w); xx++) {
				if (gable) {
					const peak = Math.min(xx - x, x + w - 1 - xx);
					if (yy < top + Math.max(0, 3 - peak)) continue;
				}
				put(xx, yy, dim);
			}
		if (noise(k, 4) < 0.45) put(x + 3, top + 5, ramp[n - 1]);
		x += w;
		k++;
	}
	// 歩道と路面
	for (let yy = horizon; yy < H; yy++)
		for (let xx = 0; xx < W; xx++)
			put(xx, yy, yy === horizon ? dim : noise(xx, yy) < 0.04 ? dim : ink);
	// 電柱（3本）と電線（たわんだ1ドット線）
	const poles = [0.1, 0.52, 0.92].map((f) => Math.round(W * f));
	const poleTop = Math.round(H * 0.08);
	for (const px of poles) {
		for (let yy = poleTop; yy < horizon + 3; yy++) {
			put(px, yy, ink);
			put(px + 1, yy, ink);
		}
		for (let xx = px - 4; xx <= px + 5; xx++) put(xx, poleTop + 3, ink);
		for (let xx = px - 3; xx <= px + 4; xx++) put(xx, poleTop + 7, ink);
		put(px - 2, poleTop + 2, ink);
		put(px + 3, poleTop + 2, ink);
	}
	for (let wire = 0; wire < 3; wire++) {
		const y0 = poleTop + 3 + wire * 2;
		for (let p = 0; p < poles.length - 1; p++) {
			const a = poles[p];
			const b = poles[p + 1];
			const sag = (b - a) * (0.08 + wire * 0.02);
			for (let xx = a; xx <= b; xx++) {
				const t = (xx - a) / (b - a);
				put(xx, Math.round(y0 + 4 * sag * t * (1 - t)), ink);
			}
		}
		// 画面の外へ出ていく線
		for (let xx = 0; xx < poles[0]; xx++)
			put(xx, y0 + Math.round((poles[0] - xx) * 0.05), ink);
		for (let xx = poles[2]; xx < W; xx++)
			put(xx, y0 + Math.round((xx - poles[2]) * 0.06), ink);
	}
	g.putImageData(img, 0, 0);
	// 横切るキリコ（歩道の上。シルエット）
	if (walker?.frame) {
		g.globalCompositeOperation = "source-over";
		g.drawImage(walker.frame, Math.round(walker.x), horizon - 14);
	}
};

/** タイトルを出し、「はじめから／つづきから」で選ばれた状態を返す。 */
export const showTitle = (game: Game): Promise<GameState> =>
	new Promise((resolve) => {
		const { data } = game;
		game.audio.bgm(data.titleBgm);
		document.title = data.title.replace(/\n/g, " ");

		const cleared = hasClearMark();
		// 動きを減らす設定の端末では、化け・空の反転・シルエット横断を出さない
		const calm =
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

		// ── 背景（空・電柱・電線・歩道）。すべてシルエットの書き割り ──
		const root0Class: string[] = [];
		const skyNight = el("div", { class: "title-sky-night" });
		const walker = el("canvas", { class: "title-walker" });
		walker.width = 16;
		walker.height = 16;
		const scape = el("div", { class: "title-scape" });
		scape.appendChild(el("div", { class: "title-sky" }));
		scape.appendChild(skyNight);
		scape.appendChild(wiresSvg());
		scape.appendChild(el("div", { class: "title-pole p1" }));
		scape.appendChild(el("div", { class: "title-pole p2" }));
		scape.appendChild(el("div", { class: "title-pole p3" }));
		scape.appendChild(el("div", { class: "title-street" }));
		scape.appendChild(walker);
		// ジオラマ表示：書き割りをドット絵の1枚に（空・家並み・電柱・電線・キリコ）
		const pix = el("canvas", { class: "title-pix" });
		const silhouette = document.createElement("canvas");
		silhouette.width = 16;
		silhouette.height = 16;
		if (DIORAMA) {
			scape.replaceChildren(pix);
			root0Class.push("pix");
		}

		// ── 題字（プレート廃止。控えめな白の DotGothic16 の2行だけ） ──
		const lineEls = data.title
			.split("\n")
			.map((s) => el("div", { class: "title-name-line", text: s }));
		const name = el("div", { class: "title-name" }, lineEls);

		const root = el("div", {
			class: `title${cleared ? " cleared" : ""}${root0Class.length ? ` ${root0Class.join(" ")}` : ""}`,
		});
		root.appendChild(scape);
		root.appendChild(
			el("div", {
				class: "title-clock",
				html: cleared ? "7<span>:</span>00" : "17<span>:</span>03",
			}),
		);
		root.appendChild(name);
		root.appendChild(
			el("div", { class: "title-sub", text: data.subtitle ?? "" }),
		);
		const buttons = el("div", { class: "title-buttons" });
		root.appendChild(buttons);
		root.appendChild(
			el("div", {
				class: "title-foot",
				text: "BGM・効果音は右上の🔊で切り替え",
			}),
		);
		game.ui.appendChild(root);

		// ── 演出ループ（空の一瞬の反転・1文字化け・シルエット横断・ヒグラシ1波） ──
		let busy = false; // メニュー決定後は SE を足さない（下のメニュー処理と共有）
		const walkRef = data.cast.kiriko?.walk ?? "sa:vHsmy5";
		const walkerCtx = walker.getContext("2d");
		// 化けられる字の位置（行・字番号）を先に拾っておく
		const spots = lineEls.flatMap((lineEl, li) => {
			const base = data.title.split("\n")[li];
			return [...base].flatMap((ch, i) =>
				GLITCH[ch] ? [{ lineEl, base, i }] : [],
			);
		});
		let nextGlitch = 0; // 次に化ける時刻
		let glitchUntil = 0; // 化けている間は戻す時刻
		let glitched: { lineEl: HTMLElement; base: string } | null = null;
		let nextNight = 0; // 次に空が深夜色になる時刻
		let nightUntil = 0; // 反転している間は戻す時刻
		let nextCross = 0; // 次にシルエットが現れる時刻
		let cross: { start: number; dur: number; dir: 1 | -1 } | null = null;
		let seDone = false; // ヒグラシ（朝はスズメ）を1波だけ
		let raf = 0;
		const anim = (t: number) => {
			if (!root.isConnected) return;
			if (!nextGlitch) {
				// 初回フレームで時刻を初期化
				nextGlitch = t + 45_000 + Math.random() * 45_000;
				nextNight = t + 18_000 + Math.random() * 22_000;
				nextCross = t + 8_000 + Math.random() * 14_000;
			}
			// ヒグラシの1波（音が出せるようになった最初のフレームで。BGM title の前奏として）
			if (!seDone && !busy && game.audio.unlocked) {
				seDone = true;
				game.audio.se(cleared ? "suzume" : "higurashi", { volume: 0.6 });
			}
			// 空の反転（数十秒に一度・半秒だけ深夜色→戻る）。朝は起きない
			if (!cleared && !calm) {
				if (nightUntil && t >= nightUntil) {
					root.classList.remove("night");
					nightUntil = 0;
					nextNight = t + 40_000 + Math.random() * 20_000;
				} else if (!nightUntil && t >= nextNight) {
					root.classList.add("night");
					nightUntil = t + 500;
				}
			}
			// 1文字化け（ごく稀に・0.4〜0.7秒で戻る）。朝は化けない
			if (!cleared && !calm && spots.length) {
				if (glitchUntil && t >= glitchUntil) {
					if (glitched) glitched.lineEl.textContent = glitched.base;
					glitched = null;
					glitchUntil = 0;
					nextGlitch = t + 50_000 + Math.random() * 40_000;
				} else if (!glitchUntil && t >= nextGlitch) {
					const s = spots[Math.floor(Math.random() * spots.length)];
					s.lineEl.textContent =
						s.base.slice(0, s.i) + GLITCH[s.base[s.i]] + s.base.slice(s.i + 1);
					glitched = s;
					glitchUntil = t + 400 + Math.random() * 300;
				}
			}
			// シルエット横断（数十秒に一度・十数秒かけてゆっくり）
			if (!calm) {
				if (!cross && t >= nextCross) {
					cross = {
						start: t,
						dur: 12_000 + Math.random() * 5_000,
						dir: Math.random() < 0.5 ? 1 : -1,
					};
					walker.classList.add("crossing");
				}
				if (cross) {
					const p = (t - cross.start) / cross.dur;
					if (p >= 1) {
						cross = null;
						walker.classList.remove("crossing");
						nextCross = t + 25_000 + Math.random() * 30_000;
					} else {
						const w = root.clientWidth + 96;
						const x = (cross.dir > 0 ? p : 1 - p) * w - 48;
						walker.style.transform = `translateX(${x}px)`;
						if (walkerCtx) {
							walkerCtx.imageSmoothingEnabled = false;
							walkerCtx.clearRect(0, 0, 16, 16);
							drawWalk(
								walkerCtx,
								walkRef,
								cross.dir > 0 ? "right" : "left",
								stepFrame(t, true),
								0,
								0,
							);
						}
					}
				}
			}
			if (DIORAMA) {
				// 画面の大きさに合わせて、整数倍で拡大できる低解像度の画用紙にする
				const cw = root.clientWidth || 320;
				const ch = root.clientHeight || 480;
				const scale = Math.max(2, Math.floor(Math.min(cw, ch) / 150));
				const W = Math.ceil(cw / scale);
				const H = Math.ceil(ch / scale);
				if (pix.width !== W || pix.height !== H) {
					pix.width = W;
					pix.height = H;
					pix.style.width = `${W * scale}px`;
					pix.style.height = `${H * scale}px`;
				}
				const tod = cleared
					? "asa"
					: root.classList.contains("night")
						? "shinya"
						: "yu";
				let wk: { x: number; frame: HTMLCanvasElement | null } | null = null;
				if (cross) {
					const p = (t - cross.start) / cross.dur;
					const sg = silhouette.getContext("2d");
					if (sg && p < 1) {
						sg.imageSmoothingEnabled = false;
						sg.clearRect(0, 0, 16, 16);
						drawWalk(
							sg,
							walkRef,
							cross.dir > 0 ? "right" : "left",
							stepFrame(t, true),
							0,
							0,
						);
						// シルエットにする（いちばん暗い段で塗る）
						sg.globalCompositeOperation = "source-in";
						const [r, gg, b] = scenePalette(tod).ramp[0];
						sg.fillStyle = `rgb(${r},${gg},${b})`;
						sg.fillRect(0, 0, 16, 16);
						sg.globalCompositeOperation = "source-over";
						wk = {
							x: (cross.dir > 0 ? p : 1 - p) * (W + 32) - 16,
							frame: silhouette,
						};
					}
				}
				drawPixelScape(pix, tod, wk);
			}
			raf = requestAnimationFrame(anim);
		};
		raf = requestAnimationFrame(anim);

		// ── メニュー（機能は rpg 由来の現行のまま・見た目だけ style.css で変更） ──
		const showDebug =
			!!data.debug &&
			(import.meta.env.DEV ||
				new URLSearchParams(location.search).has("debug"));
		const items = () => [
			{ label: "はじめから", value: "new" },
			{ label: "つづきから", value: "load", disabled: !hasSave() },
			{ label: "せってい", value: "settings" },
			...(showDebug ? [{ label: "デバッグルーム", value: "debug" }] : []),
		];
		let cur = hasSave() ? 1 : 0;
		const render = () => {
			buttons.replaceChildren();
			items().forEach((it, i) => {
				const b = el("button", {
					class: `title-btn${i === cur ? " cur" : ""}${it.disabled ? " disabled" : ""}`,
					text: it.label,
				});
				b.addEventListener("pointerdown", (e) => {
					e.preventDefault();
					e.stopPropagation();
					game.input.onAnyInput?.();
					if (!it.disabled) void pick(it.value);
				});
				buttons.appendChild(b);
			});
		};
		render();
		const pop = game.input.push((k) => {
			if (busy) return;
			const list = items();
			if (k === "up" || k === "down") {
				do cur = (cur + (k === "up" ? -1 : 1) + list.length) % list.length;
				while (list[cur].disabled);
				game.audio.se("cursor");
				render();
			} else if (k === "a" && !list[cur].disabled) {
				void pick(list[cur].value);
			}
		});
		const pick = async (v: string) => {
			if (busy) return;
			busy = true;
			game.audio.se("decide");
			if (v === "settings") {
				await settingsMenu(game);
				game.msg.close();
				busy = false;
				render();
				return;
			}
			let state: GameState | null = null;
			if (v === "load") state = readSave()?.state ?? null;
			if (v === "new" && hasSave()) {
				const n = await listWindow(
					game,
					"きろくが　あります。はじめから　あそびますか？",
					[
						{ label: "はじめから", value: "yes" },
						{ label: "やめる", value: "no" },
					],
				);
				if (n !== "yes") {
					busy = false;
					return;
				}
			}
			if (v === "debug" && data.debug) {
				// flags.debug が立っていると記録しない（engine/save.ts）
				const st = game.newState();
				state = { ...st, ...data.debug, flags: { ...st.flags, debug: true } };
			}
			state ??= game.newState();
			pop();
			cancelAnimationFrame(raf);
			root.classList.add("leaving");
			game.audio.bgm(null);
			setTimeout(() => {
				root.remove();
				resolve(state);
			}, 500);
		};
	});
