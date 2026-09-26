// タイトル画面 —「深夜の駅名標」（docs/content-briefs.md タイトル画面 節）。
// ほぼ黒の画面に白い駅名標プレートが浮かび、蛍光灯風にときどき明滅する。
// ごく稀に1文字だけ化けてすぐ戻る。画面下は暗い線路の暗示で、
// キリコのシルエットが数十秒に一度ゆっくり横切る。
// クリア済み（hasClearMark）なら朝：明滅も化けも止まり、時計が 7:00 になり、
// プレートのひらがなが一行だけ優しい内容に変わる（周回差分）。

import type { GameState } from "../engine/defs";
import type { Game } from "../engine/game";
import { hasClearMark, hasSave, readSave } from "../engine/save";
import { drawWalk, stepFrame } from "../engine/sprite";
import { el } from "./dom";
import { listWindow, settingsMenu } from "./menu";

/** 駅名標の大きなひらがな。 */
const SIGN_BIG = "きさらぎかいせん";

/** 1文字化けの置換表（似た字・濁点の増減だけ。派手にしない）。 */
const GLITCH: Record<string, string> = {
	き: "ぎ",
	さ: "ち",
	ら: "ろ",
	ぎ: "き",
	か: "が",
	い: "ぃ",
	せ: "ぜ",
};

/** タイトルを出し、「はじめから／つづきから」で選ばれた状態を返す。 */
export const showTitle = (game: Game): Promise<GameState> =>
	new Promise((resolve) => {
		const { data } = game;
		game.audio.bgm(data.titleBgm);
		document.title = data.title.replace(/\n/g, " ");

		const cleared = hasClearMark();
		// 動きを減らす設定の端末では、化け・シルエット横断も出さない（CSS 側で明滅等も止まる）
		const calm =
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

		// ── 駅名標プレート ──
		const bigText = cleared ? "おかえりなさい" : SIGN_BIG;
		const big = el("div", { class: "title-sign-big", text: bigText });
		const sign = el("div", { class: "title-sign" }, [
			big,
			el("div", {
				class: "title-sign-name",
				text: data.title.replace(/\n/g, "　"),
			}),
			el("div", { class: "title-sign-romaji", text: "KISARAGI KAISEN" }),
			// 隣駅表示は両側とも空白（どこから来て どこへ行くのかは書かない）
			el("div", { class: "title-sign-band" }, [
				el("span", { text: "←　　　　" }),
				el("span", { text: "　　　　→" }),
			]),
		]);

		// ── 線路の暗示＋横切るシルエット（kiriko.png を黒く塗って使う） ──
		const walker = el("canvas", { class: "title-walker" });
		walker.width = 16;
		walker.height = 16;
		const rail = el("div", { class: "title-rail" }, [walker]);

		const root = el("div", { class: `title${cleared ? " cleared" : ""}` }, [
			el("div", {
				class: "title-clock",
				html: `${cleared ? "7" : "2"}<span>:</span>00`,
			}),
			sign,
			el("div", { class: "title-sub", text: data.subtitle ?? "" }),
		]);
		const buttons = el("div", { class: "title-buttons" });
		root.appendChild(buttons);
		root.appendChild(
			el("div", {
				class: "title-foot",
				text: "BGM・効果音は右上の🔊で切り替え",
			}),
		);
		root.appendChild(rail);
		game.ui.appendChild(root);

		// ── 演出ループ（1文字化け・シルエット横断） ──
		const walkRef = data.cast.kiriko?.walk ?? "pub:sprites/kiriko.png";
		const walkerCtx = walker.getContext("2d");
		let nextGlitch = 0; // 次に化ける時刻
		let glitchUntil = 0; // 化けている間は戻す時刻
		let nextCross = 0; // 次にシルエットが現れる時刻
		let cross: { start: number; dur: number; dir: 1 | -1 } | null = null;
		let raf = 0;
		const anim = (t: number) => {
			if (!root.isConnected) return;
			if (!nextGlitch) {
				// 初回フレームで時刻を初期化
				nextGlitch = t + 15_000 + Math.random() * 25_000;
				nextCross = t + 8_000 + Math.random() * 14_000;
			}
			// 1文字化け（数十秒に一度・0.4〜0.9秒で戻る）。朝は化けない
			if (!cleared && !calm) {
				if (glitchUntil && t >= glitchUntil) {
					big.textContent = SIGN_BIG;
					glitchUntil = 0;
					nextGlitch = t + 20_000 + Math.random() * 30_000;
				} else if (!glitchUntil && t >= nextGlitch) {
					const idxs = [...SIGN_BIG]
						.map((ch, i) => (GLITCH[ch] ? i : -1))
						.filter((i) => i >= 0);
					const i = idxs[Math.floor(Math.random() * idxs.length)];
					big.textContent =
						SIGN_BIG.slice(0, i) + GLITCH[SIGN_BIG[i]] + SIGN_BIG.slice(i + 1);
					glitchUntil = t + 400 + Math.random() * 500;
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
		let busy = false;
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
