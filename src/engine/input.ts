// 入力（キーボード・ゲームパッド・画面上の十字キー/ボタン・タップ）をまとめる。
//
// - 方向は「押しっぱなし」を持つ（フィールド移動はポーリングで読む）。
// - A/B と方向の「押した瞬間」は、ハンドラのスタック最上段に配る。
//   メッセージ窓・選択肢・メニュー・戦闘がハンドラを積み、閉じたら外す。
//   スタックが空のときはフィールド用キューに入る。
// - ゲームパッドは ボタンを キーボードの キーに 読みかえて 同じ 道を 通す（GAMEPAD_CODES）。

import type { Dir } from "./types";

export type Key = Dir | "a" | "b";
type Handler = (key: Key, repeat: boolean) => void;
/**
 * ハンドラを積むときの設定。
 * - tap: 窓の外（フィールド）をタップしたときに押したことにするキー（既定 "a"＝メッセージ送り）。
 *   メニュー・選択肢は "b"（とじる）。null なら何もしない
 */
export type PushOptions = { tap?: Key | null };

const KEYMAP: Record<string, Key> = {
	ArrowUp: "up",
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
	KeyW: "up",
	KeyS: "down",
	KeyA: "left",
	KeyD: "right",
	KeyZ: "a",
	Enter: "a",
	Space: "a",
	KeyX: "b",
	Escape: "b",
	Backspace: "b",
	// ゲームパッドの 十字キー・左スティック（GAMEPAD_CODES・stickCodes）
	GpUp: "up",
	GpDown: "down",
	GpLeft: "left",
	GpRight: "right",
	GsUp: "up",
	GsDown: "down",
	GsLeft: "left",
	GsRight: "right",
	GpA: "a",
	GpB: "b",
	// START は 画面の メニューボタンと 同じく B
	GpStart: "b",
};

/**
 * ゲームパッド（標準の 並び）の ボタン番号 → 読みかえる キー。
 * 名前は 任天堂の 並び（右＝A・下＝B）。標準の 番号は 下 0・右 1。
 * Xbox の パッドは 刻印どおり（XBOX_CODES）。
 */
const GAMEPAD_CODES: Record<number, string> = {
	0: "GpB",
	1: "GpA",
	9: "GpStart",
	12: "GpUp",
	13: "GpDown",
	14: "GpLeft",
	15: "GpRight",
};
/**
 * Xbox の パッドは 刻印が 逆（下＝A・右＝B）なので、刻印どおりに 読む。
 * 見分けは gp.id（「Xbox」「XInput」や マイクロソフトの ベンダー 045e）。ほかは 任天堂の 並び。
 */
const XBOX_CODES: Record<number, string> = {
	...GAMEPAD_CODES,
	0: "GpA",
	1: "GpB",
};
const isXboxPad = (id: string): boolean => /xbox|xinput|045e/i.test(id);
/** スティックを これより 倒したら 向きにする。 */
const STICK_DEAD = 0.5;
/** ゲームパッドの 方向・A を 押さえつづけたときの くりかえし（キーボードの リピートの 代わり）。 */
const GP_REPEAT_DELAY = 350;
const GP_REPEAT_MS = 90;

/** 左スティックの 倒しかた → 押している 向きの キー（4方向。いちばん 倒した 軸）。 */
const stickCode = (x: number, y: number): string | null => {
	if (Math.hypot(x, y) < STICK_DEAD) return null;
	if (Math.abs(x) > Math.abs(y)) return x > 0 ? "GsRight" : "GsLeft";
	return y > 0 ? "GsDown" : "GsUp";
};

const isDir = (k: Key): k is Dir =>
	k === "up" || k === "down" || k === "left" || k === "right";

export class Input {
	/** 押されている方向（後に押したものほど後ろ）。source は "key:ArrowUp" / "pad" など。 */
	private held: { dir: Dir; source: string }[] = [];
	private handlers: { fn: Handler; tap: Key | null }[] = [];
	private fieldQueue: Key[] = [];
	/** フィールドでのタップ（ソース画素ではなく、canvas の左上から数えた CSS 画素）。 */
	onFieldTap: ((x: number, y: number) => void) | null = null;
	/** 何かしら入力があったとき（オーディオのアンロック用）。 */
	onAnyInput: (() => void) | null = null;
	/** ゲームパッドで 押さえている ボタン（code → 押した 時刻。くりかえしの 時刻に 進める）。 */
	private gpDown = new Map<string, number>();
	private gpPolling = false;

	constructor() {
		window.addEventListener("keydown", (e) => {
			const key = KEYMAP[e.code];
			if (!key) return;
			// テキスト入力中は奪わない（現状は無いが念のため）
			const t = e.target as HTMLElement | null;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
			e.preventDefault();
			if (isDir(key)) this.hold(key, `key:${e.code}`);
			this.press(key, e.repeat);
		});
		window.addEventListener("keyup", (e) => {
			const key = KEYMAP[e.code];
			if (key && isDir(key)) this.release(`key:${e.code}`);
		});
		window.addEventListener("blur", () => {
			this.held = [];
			this.gpDown.clear();
		});
		window.addEventListener("gamepadconnected", () => this.pollGamepads());
	}

	/**
	 * ゲームパッドを 毎コマ 読み、押した・離した ボタンを キーボードと 同じに 配る。
	 * つながっている あいだだけ 回す（ブラウザは ボタンを 押すまで パッドを 見せないことが ある）。
	 */
	private pollGamepads(): void {
		if (this.gpPolling) return;
		this.gpPolling = true;
		const tick = () => {
			const pads = navigator.getGamepads?.() ?? [];
			const now = new Set<string>();
			let any = false;
			for (const gp of pads) {
				if (!gp?.connected) continue;
				any = true;
				const codes = isXboxPad(gp.id) ? XBOX_CODES : GAMEPAD_CODES;
				gp.buttons.forEach((b, i) => {
					const code = codes[i];
					if (code && (b.pressed || b.value > 0.5)) now.add(code);
				});
				const c = stickCode(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
				if (c) now.add(c);
			}
			const t = performance.now();
			for (const code of now) {
				const key = KEYMAP[code];
				const since = this.gpDown.get(code);
				if (since === undefined) {
					this.gpDown.set(code, t);
					if (isDir(key)) this.hold(key, `gp:${code}`);
					this.press(key);
				} else if (
					(isDir(key) || key === "a") &&
					t - since >= GP_REPEAT_DELAY
				) {
					// 窓の カーソル送り・A の 押しっぱなしの 早送り（キーボードの リピートと 同じく repeat で 配る）
					this.gpDown.set(code, t - GP_REPEAT_DELAY + GP_REPEAT_MS);
					this.press(key, true);
				}
			}
			for (const code of [...this.gpDown.keys()])
				if (!now.has(code)) {
					this.gpDown.delete(code);
					this.release(`gp:${code}`);
				}
			if (any) requestAnimationFrame(tick);
			else this.gpPolling = false;
		};
		requestAnimationFrame(tick);
	}

	/** 押した瞬間のキーを配る。 */
	press(key: Key, repeat = false): void {
		this.onAnyInput?.();
		const top = this.handlers[this.handlers.length - 1];
		if (top) {
			top.fn(key, repeat);
			return;
		}
		if (!repeat && !isDir(key)) this.fieldQueue.push(key);
	}

	hold(dir: Dir, source: string): void {
		this.held = this.held.filter((h) => h.source !== source);
		this.held.push({ dir, source });
	}

	release(source: string): void {
		this.held = this.held.filter((h) => h.source !== source);
	}

	/** いま押されている方向（最後に押したもの）。 */
	heldDir(): Dir | null {
		return this.held.length ? this.held[this.held.length - 1].dir : null;
	}

	/** ハンドラを積む。戻り値を呼ぶと外れる。 */
	push(handler: Handler, opt: PushOptions = {}): () => void {
		const h = { fn: handler, tap: opt.tap === undefined ? "a" : opt.tap };
		this.handlers.push(h);
		this.fieldQueue = [];
		return () => {
			const i = this.handlers.lastIndexOf(h);
			if (i >= 0) this.handlers.splice(i, 1);
		};
	}

	get busy(): boolean {
		return this.handlers.length > 0;
	}

	/** フィールド用キューから1つ取り出す。 */
	takeField(): Key | undefined {
		return this.fieldQueue.shift();
	}

	clearField(): void {
		this.fieldQueue = [];
	}

	/** 画面上の十字キー（1つの要素。中心からの角度で方向を決める）。 */
	bindPad(el: HTMLElement): void {
		let active: number | null = null;
		let last: Dir | null = null;
		const update = (e: PointerEvent) => {
			const r = el.getBoundingClientRect();
			const dx = e.clientX - (r.left + r.width / 2);
			const dy = e.clientY - (r.top + r.height / 2);
			const dead = r.width * 0.12;
			let dir: Dir | null = null;
			if (Math.hypot(dx, dy) > dead) {
				dir =
					Math.abs(dx) > Math.abs(dy)
						? dx > 0
							? "right"
							: "left"
						: dy > 0
							? "down"
							: "up";
			}
			if (dir !== last) {
				last = dir;
				if (dir) {
					this.hold(dir, "pad");
					this.press(dir);
				} else {
					this.release("pad");
				}
				el.dataset.dir = dir ?? "";
			}
		};
		el.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			active = e.pointerId;
			el.setPointerCapture(e.pointerId);
			last = null;
			update(e);
		});
		el.addEventListener("pointermove", (e) => {
			if (e.pointerId === active) update(e);
		});
		const end = (e: PointerEvent) => {
			if (e.pointerId !== active) return;
			active = null;
			last = null;
			el.dataset.dir = "";
			this.release("pad");
		};
		el.addEventListener("pointerup", end);
		el.addEventListener("pointercancel", end);
	}

	/** 画面上のボタン（A/B）。 */
	bindButton(el: HTMLElement, key: Key): void {
		el.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			el.classList.add("down");
			this.press(key);
		});
		const up = () => el.classList.remove("down");
		el.addEventListener("pointerup", up);
		el.addEventListener("pointercancel", up);
		el.addEventListener("pointerleave", up);
	}

	/**
	 * フィールド（canvas）のタップ。ハンドラが積まれているときは そのハンドラの tap のキー扱い
	 * （メッセージ送りは A、メニューは B）、空ならタップ移動としてフィールドへ渡す。
	 */
	bindField(el: HTMLElement): void {
		el.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			this.onAnyInput?.();
			const top = this.handlers[this.handlers.length - 1];
			if (top) {
				if (top.tap) this.press(top.tap);
				return;
			}
			// canvas は画面の左上とはかぎらない（ブラウザのバーのぶんだけ下にずれる）ので、
			// canvas の枠を基準に数え直す
			const r = el.getBoundingClientRect();
			this.onFieldTap?.(e.clientX - r.left, e.clientY - r.top);
		});
	}
}
