// ゲーム本体：メインループ・フィールド操作・シナリオ（Story API）の実行。

import { el, nextFrame } from "../ui/dom";
import { ChoiceWindow, MessageWindow, type PortraitSpec } from "../ui/message";
import { preloadImages } from "./assets";
import type { GameAudio } from "./audio";
import type {
	AmbientDef,
	EndingSummary,
	EventDef,
	GameData,
	GameState,
	MapDef,
	SayOptions,
	Script,
	Story,
} from "./defs";
import { boxFor, boxPlacement, DIORAMA, renderDiorama } from "./diorama";
import { Actor, Field } from "./field";
import type { Input } from "./input";
import { writeSave } from "./save";
import type { Screen } from "./screen";
import { settings } from "./settings";
import { DIR_VEC, type Dir, OPPOSITE, sleep, TILE } from "./types";

/** スクリプトを中断してタイトルへ戻すための合図。 */
export class ResetToTitle extends Error {}

const WALK_MS = 170;

/** 主人公のキャラ ID（歩行グラの引き当てに使う）。 */
const LEADER = "kiriko";

/** 暗闇（MapDef.dark）の光の半径（マス）。 */
const LIGHT_RADIUS = 3.5;
/** 懐中電灯（フラグ flashlight）を持っているときの光の半径（マス）。 */
const LIGHT_RADIUS_FLASHLIGHT = 6.5;
/** 光のふちのぼかし幅（マス）。 */
const LIGHT_EDGE = 1.5;

/**
 * 時間帯の色調プリセット（DESIGN §4）。屋外マップ（MapDef.outdoor）の描画時、
 * フラグ tod（"yu"|"yoru"|"shinya"|"asa"。将来 "hiru"）に対応する項があれば、
 * その tint / outside を MapDef の値より優先して使う。夕=茜、深夜=青暗、朝=金。
 * yoru（夜）は室内パートなのでプリセットなし（マップ自身の色のまま）。
 */
type TintPass = { color: string; blend?: GlobalCompositeOperation };
const TOD_PRESETS: Record<string, { passes?: TintPass[]; outside?: string }> = {
	// 夕焼け＝琥珀の overlay 1パス（明部は茜に輝き、暗部は沈む。昼にも夜にも寄らない）
	yu: {
		passes: [{ color: "rgba(235,130,50,0.75)", blend: "overlay" }],
		outside: "#1c0d12",
	},
	// 夜（宵）＝夕と深夜のあいだ。帰宅後に外へ出直しても時間が飛んで見えないように
	yoru: {
		passes: [
			{ color: "rgba(85,100,195,0.65)", blend: "multiply" },
			{ color: "rgba(128,128,128,0.30)", blend: "saturation" },
			{ color: "rgba(12,16,48,0.16)" },
		],
		outside: "#070810",
	},
	// 深夜＝ツクールの夜 (-68,-68,0,68) と同じ設計（青を最後まで残す・彩度を落とす・純黒にしない。docs/night-fx.md）
	shinya: {
		passes: [
			{ color: "rgba(90,110,210,0.70)", blend: "multiply" },
			{ color: "rgba(128,128,128,0.45)", blend: "saturation" },
			{ color: "rgba(12,16,48,0.22)" },
		],
		outside: "#04060f",
	},
	asa: {
		passes: [
			{ color: "rgba(255,240,210,0.30)", blend: "screen" },
			{ color: "rgba(255,215,140,0.40)", blend: "overlay" },
		],
	},
};

/** ビネットの色（青黒。純黒より murk になりにくい。docs/night-fx.md §3）。 */
const VIGNETTE_RGB = "5,6,15";
/** ビネットの強さ（globalAlpha）。時間帯別。dark マップでは重ねない。 */
const VIGNETTE_BY_TOD: Record<string, number> = {
	shinya: 0.3,
	yu: 0.12,
	asa: 0.08,
};
/** 光源（MapDef.lights）の点灯強度。深夜=全灯、夜=宵、夕=営業中の窓あかり。 */
const LIGHTS_BY_TOD: Record<string, number> = { shinya: 1, yoru: 0.9, yu: 0.4 };
/** 深夜にプレイヤーの足元へ常駐させる月明かり（可読性の守り。ランタンに見せない青白）。 */
const MOON_GLOW = { r: 1.75, color: "#9db4e8", alpha: 0.25 };

/** 0〜1 の決まった乱数（粒の置き場所など。毎コマ同じ値になる）。 */
const hash01 = (n: number): number => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

/**
 * ただよう粒（MapDef.ambient）。roguelike の drawAmbient の移植。
 * 粒は地面に対して止まった空間にあり（歩くと景色といっしょに流れる）、
 * 画面の大きさの箱を くり返して しきつめる。時刻から決める（状態を持たない）。
 */
const drawAmbient = (
	ctx: CanvasRenderingContext2D,
	ambient: AmbientDef,
	time: number,
	ox: number,
	oy: number,
	w: number,
	h: number,
): void => {
	const sec = time / 1000;
	const n = Math.round(((w * h) / (240 * 400)) * 40);
	const wrap = (v: number, m: number) => ((v % m) + m) % m;
	for (let i = 0; i < n; i++) {
		const r1 = hash01(i);
		const r2 = hash01(i + 101);
		const r3 = hash01(i + 211);
		let x = r1 * w;
		let y = r2 * h;
		let a = 0.5;
		let size = 1;
		let color = "#fff";
		switch (ambient.kind) {
			case "dust":
				y += sec * (3 + r3 * 4);
				x += Math.sin(sec * 0.6 + i) * 4;
				a = 0.35 + r3 * 0.35;
				size = r3 > 0.75 ? 2 : 1;
				color = "#e6d3a8";
				break;
			case "snow":
				y += sec * (10 + r3 * 10);
				x += -sec * 4 + Math.sin(sec * 1.1 + i) * 5;
				a = 0.5 + r3 * 0.35;
				size = r3 > 0.7 ? 2 : 1;
				color = "#e6f4ff";
				break;
			case "rain":
				// 速く落ちる筋。すこし左へ流す
				y += sec * (90 + r3 * 60);
				x += -sec * 12;
				a = 0.25 + r3 * 0.3;
				color = "#9db4d0";
				break;
			case "static":
				// 砂嵐。位置ごと ちらちら 置き替わる（画面に貼りつく）
				x = hash01(i * 31 + Math.floor(sec * 8) * 7) * w + ox;
				y = hash01(i * 47 + Math.floor(sec * 8) * 13) * h + oy;
				a = 0.1 + 0.5 * hash01(i + Math.floor(sec * 8) * 29);
				color = "#cfd8dc";
				break;
			case "embers":
				y -= sec * (12 + r3 * 14);
				x += Math.sin(sec * 1.7 + i * 2.1) * 5;
				a = 0.45 + 0.4 * Math.sin(sec * 9 + i * 3.7);
				size = r3 > 0.8 ? 2 : 1;
				color = r3 > 0.5 ? "#ffb04a" : "#ff6a3a";
				break;
		}
		if (a <= 0.02) continue;
		const px = Math.round(wrap(x - ox, w));
		const py = Math.round(wrap(y - oy, h));
		ctx.globalAlpha = Math.min(1, a);
		ctx.fillStyle = ambient.color ?? color;
		if (ambient.kind === "rain") ctx.fillRect(px, py, 1, 4);
		else ctx.fillRect(px, py, size, size);
	}
	ctx.globalAlpha = 1;
};

/** メニュー・章タイトル・エンディングの画面（ui/ 側で実装して注入する）。 */
export type Scenes = {
	menu(game: Game): Promise<void>;
	chapter(game: Game, label: string, title: string): Promise<void>;
	ending(game: Game, opt?: { summary?: EndingSummary }): Promise<void>;
};

export class Game {
	readonly data: GameData;
	readonly screen: Screen;
	readonly input: Input;
	readonly audio: GameAudio;
	readonly ui: HTMLElement;
	readonly msg: MessageWindow;
	readonly choice: ChoiceWindow;
	scenes!: Scenes;
	state!: GameState;
	field: Field | null = null;
	player!: Actor;
	private scriptDepth = 0;
	/** 操作で歩き始めた1歩がまだ着いていない（着いたら踏むイベントを調べる）。 */
	private stepPending = false;
	/** マップを移ったので、スクリプトが終わったら自動セーブする。 */
	private autosavePending = false;
	private path: Dir[] = [];
	private pathTalk: Actor | null = null;
	private marker: { x: number; y: number; t: number } | null = null;
	private time = 0;
	/** いまのマップに入った時刻（time 基準）。深夜の「夜が深まる」黒の進行に使う。 */
	private mapEnteredAt = 0;
	private last = 0;
	private camX = 0;
	private camY = 0;
	private running = false;
	private fadeEl: HTMLDivElement;
	private toastEl: HTMLDivElement;
	private rafId = 0;
	/** 暗闇の作業キャンバス（画面と同じ大きさ。大きさが変わったら作り直す）。 */
	private darkCanvas: HTMLCanvasElement | null = null;
	/** ビネット（全強度で1枚だけ作り、globalAlpha で時間帯別に減衰）。リサイズで作り直す。 */
	private vignetteCanvas: HTMLCanvasElement | null = null;
	/** 光源の光だまりスタンプ（半径:色 ごとにキャッシュ）。 */
	private glowStamps = new Map<string, HTMLCanvasElement>();
	/** 光の抜き型（放射グラデーション。半径が変わったら作り直す）。 */
	private lightStamp: { canvas: HTMLCanvasElement; radius: number } | null =
		null;
	/** タイトルへ戻るとき呼ぶ（main.ts が設定）。 */
	onReset: (() => void) | null = null;

	constructor(
		data: GameData,
		screen: Screen,
		input: Input,
		audio: GameAudio,
		ui: HTMLElement,
	) {
		this.data = data;
		this.screen = screen;
		this.input = input;
		this.audio = audio;
		this.ui = ui;
		// 文送りと選択肢の決定は、鳴らしたばかりの効果音の区切りまで待つ（audio.ts）
		this.msg = new MessageWindow(
			ui,
			input,
			() => settings.textMs,
			() => audio.seSettled(),
		);
		this.choice = new ChoiceWindow(ui, input, () => audio.seHeld);
		this.fadeEl = el("div", { class: "fade" });
		this.toastEl = el("div", { class: "toast" });
		ui.append(this.fadeEl, this.toastEl);
		input.onFieldTap = (x, y) => this.onTap(x, y);
	}

	// ───────────────── 起動・停止 ─────────────────

	newState(): GameState {
		const st = this.data.start;
		return {
			mapId: st.mapId,
			x: st.x,
			y: st.y,
			dir: st.dir,
			flags: { ...(st.flags ?? {}) },
			items: { ...(st.items ?? {}) },
			playMs: 0,
		};
	}

	async start(state: GameState): Promise<void> {
		this.state = state;
		this.running = true;
		this.autosavePending = false;
		this.fadeEl.style.transition = "none";
		this.fadeEl.style.opacity = "1";
		await this.loadMap(state.mapId, state.x, state.y, state.dir);
		this.last = performance.now();
		cancelAnimationFrame(this.rafId);
		this.rafId = requestAnimationFrame((t) => this.frame(t));
		await this.fadeIn(400);
		this.runEnter();
	}

	stop(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.msg.close();
		// エンディングなどで暗転したままタイトルへ戻らないようにする
		this.fadeEl.style.transition = "none";
		this.fadeEl.style.opacity = "0";
		this.field?.dispose();
		this.field = null;
	}

	// ───────────────── マップ ─────────────────

	mapDef(id: string): MapDef {
		const m = this.data.maps[id];
		if (!m) throw new Error(`マップ ${id} がありません`);
		return m;
	}

	private hiddenKey(mapId: string, id: string) {
		return `hide:${mapId}:${id}`;
	}

	private eventActive(mapId: string, e: EventDef): boolean {
		const f = this.state.flags;
		if (e.once && f[`done:${mapId}:${e.id}`]) return false;
		if (f[this.hiddenKey(mapId, e.id)]) return false;
		if (e.when && !e.when(this.state)) return false;
		return true;
	}

	spriteOf(ref: string | undefined): string {
		if (!ref) return "";
		if (ref.startsWith("char:"))
			return this.data.cast[ref.slice(5)]?.walk ?? "";
		return ref;
	}

	private async loadMap(
		mapId: string,
		x: number,
		y: number,
		dir: Dir,
	): Promise<void> {
		const def = this.mapDef(mapId);
		this.field?.dispose();
		const field = new Field(def);
		this.field = field;
		this.mapEnteredAt = this.time;
		this.state.mapId = mapId;
		this.state.x = x;
		this.state.y = y;
		this.state.dir = dir;
		const leader = this.data.cast[LEADER];
		this.player = new Actor("player", x, y, dir, leader?.walk ?? "", null);
		this.player.through = false;
		this.refreshActors();
		this.stepPending = false;
		this.path = [];
		this.pathTalk = null;
		// 地形と人の画像を先に読む（読めなくても進む）
		const refs = [
			...field.imageRefs(),
			...field.actors.map((a) => a.sprite),
			this.player.sprite,
		];
		await Promise.race([preloadImages(refs.filter(Boolean)), sleep(2500)]);
		if (def.bgm !== undefined) this.audio.bgm(this.resolveBgm(def.bgm));
		this.updateCamera();
		this.toast(def.name);
	}

	/** MapDef.bgm の "@tod"（時間帯の曲）を実際の曲名に。 */
	private resolveBgm(name: string | null): string | null {
		if (name !== "@tod") return name;
		const tod = this.state.flags.tod;
		return (typeof tod === "string" && this.data.todBgm?.[tod]) || null;
	}

	/** イベントの出現状態を反映する（スクリプトの後などに呼ぶ）。 */
	refreshActors(): void {
		const field = this.field;
		if (!field) return;
		const mapId = field.def.id;
		const keep: Actor[] = [];
		for (const e of field.def.events ?? []) {
			const active = this.eventActive(mapId, e);
			const existing = field.actors.find((a) => a.def === e);
			if (active) {
				keep.push(
					existing ??
						new Actor(
							e.id,
							e.x,
							e.y,
							e.dir ?? "down",
							this.spriteOf(e.sprite),
							e,
						),
				);
			}
		}
		field.actors = keep;
	}

	// ───────────────── メインループ ─────────────────

	private frame(t: number): void {
		if (!this.running) return;
		const dt = Math.min(50, t - this.last);
		this.last = t;
		this.time += dt;
		this.state.playMs += dt;
		// 描画が一度失敗してもループを止めない（タブ非表示中のキャンバス0サイズ等）
		try {
			this.update(dt);
			this.render();
		} finally {
			this.rafId = requestAnimationFrame((tt) => this.frame(tt));
		}
	}

	private get idle(): boolean {
		return this.scriptDepth === 0 && !this.input.busy;
	}

	private update(dt: number): void {
		const field = this.field;
		if (!field) return;
		const wasMoving = this.player.moving;
		this.player.update(dt);
		// プレイヤーが操作で歩いて1マス着いたら、次の1歩を始める前にここで踏むイベントを調べる
		// （歩きの Promise の続きは次のマイクロタスクになるので、押しっぱなしだと先に次のマスへ進んでしまう）
		if (wasMoving && !this.player.moving && this.stepPending) {
			this.stepPending = false;
			this.state.x = this.player.x;
			this.state.y = this.player.y;
			this.state.dir = this.player.dir;
			if (this.scriptDepth === 0) this.afterStep();
		}
		for (const a of field.actors) {
			a.update(dt);
			if (a.def?.wander && !a.moving && this.scriptDepth === 0) {
				a.wanderWait -= dt;
				if (a.wanderWait <= 0) {
					a.wanderWait = 1200 + Math.random() * 2500;
					const dirs: Dir[] = ["up", "right", "down", "left"];
					const d = dirs[Math.floor(Math.random() * 4)];
					const nx = a.x + DIR_VEC[d].dx;
					const ny = a.y + DIR_VEC[d].dy;
					// 元の位置から2マス以上は離れない
					const home = a.def;
					if (
						Math.abs(nx - home.x) <= 2 &&
						Math.abs(ny - home.y) <= 2 &&
						field.canEnter(nx, ny, a) &&
						!(nx === this.player.x && ny === this.player.y)
					) {
						void a.walk(d, WALK_MS * 1.6);
					} else {
						a.dir = d;
					}
				}
			}
		}
		if (this.idle && !this.player.moving) this.control();
		this.updateCamera();
	}

	private control(): void {
		const field = this.field;
		if (!field) return;
		const key = this.input.takeField();
		if (key === "b") {
			this.path = [];
			void this.runScript(async () => {
				await this.scenes.menu(this);
			});
			return;
		}
		if (key === "a") {
			this.path = [];
			this.talkFront();
			return;
		}
		const held = this.input.heldDir();
		if (held) {
			this.path = [];
			this.pathTalk = null;
			void this.tryStep(held);
			return;
		}
		if (this.path.length) {
			const d = this.path.shift() as Dir;
			const v = DIR_VEC[d];
			if (
				!field.canEnter(this.player.x + v.dx, this.player.y + v.dy, this.player)
			) {
				this.path = [];
				this.pathTalk = null;
				this.player.dir = d;
				return;
			}
			void this.tryStep(d).then(() => {
				// 歩いた先でイベントが始まっていたら、話しかけはやめる
				if (!this.idle) {
					this.pathTalk = null;
					return;
				}
				if (!this.path.length && this.pathTalk) {
					const target = this.pathTalk;
					this.pathTalk = null;
					this.faceTo(this.player, target.x, target.y);
					this.talkFront();
				}
			});
			return;
		}
		if (this.pathTalk) {
			const target = this.pathTalk;
			this.pathTalk = null;
			this.faceTo(this.player, target.x, target.y);
			this.talkFront();
		}
	}

	private faceTo(a: Actor, x: number, y: number): void {
		const dx = x - a.x;
		const dy = y - a.y;
		if (dx === 0 && dy === 0) return;
		a.dir =
			Math.abs(dx) > Math.abs(dy)
				? dx > 0
					? "right"
					: "left"
				: dy > 0
					? "down"
					: "up";
	}

	/** プレイヤーを1歩進める（通れなければ向きだけ変える）。 */
	private async tryStep(d: Dir): Promise<void> {
		const field = this.field;
		if (!field) return;
		const v = DIR_VEC[d];
		const nx = this.player.x + v.dx;
		const ny = this.player.y + v.dy;
		this.player.dir = d;
		if (!field.canEnter(nx, ny, this.player)) return;
		// 着いたときの判定は update() が行う（stepPending）
		this.stepPending = true;
		await this.player.walk(d, WALK_MS);
	}

	private afterStep(): void {
		const field = this.field;
		if (!field) return;
		const { x, y } = this.player;
		// 踏むイベント
		const touch = field.actors.find(
			(a) => a.def?.trigger === "touch" && a.x === x && a.y === y && a.def.run,
		);
		if (touch?.def) {
			this.path = [];
			this.pathTalk = null;
			void this.runEvent(touch.def);
		}
	}

	/** 目の前の人に話しかける（カウンター越しも）。 */
	private talkFront(): void {
		const field = this.field;
		if (!field) return;
		const v = DIR_VEC[this.player.dir];
		let tx = this.player.x + v.dx;
		let ty = this.player.y + v.dy;
		let target = field.actors.find(
			(a) => a.x === tx && a.y === ty && a.def?.trigger === "talk",
		);
		if (!target && field.tileAt(tx, ty).counter) {
			tx += v.dx;
			ty += v.dy;
			target = field.actors.find(
				(a) => a.x === tx && a.y === ty && a.def?.trigger === "talk",
			);
		}
		if (!target?.def?.run) return;
		// 本棚や掲示板は、裏（北どなりから下を向いて）からは調べられない
		if (
			target.x === this.player.x &&
			target.y === this.player.y + 1 &&
			field.hasBack(target)
		)
			return;
		if (!target.def.fixedDir && !target.still)
			target.dir = OPPOSITE[this.player.dir];
		void this.runEvent(target.def);
	}

	/** x・y は canvas の左上から数えた CSS 画素。 */
	private onTap(x: number, y: number): void {
		const field = this.field;
		if (!field || !this.idle) return;
		const p = this.screen.cssToSource(x, y);
		const tx = Math.floor((p.x + this.camX) / TILE);
		const ty = Math.floor((p.y + this.camY) / TILE);
		if (!field.inBounds(tx, ty)) return;
		const talk = field.actors.find(
			(a) => a.x === tx && a.y === ty && a.def?.trigger === "talk" && a.visible,
		);
		// カウンターの向こうの人をタップしたときは、カウンターの手前まで行く
		let goalX = tx;
		let goalY = ty;
		if (talk) {
			for (const d of ["up", "down", "left", "right"] as Dir[]) {
				const cx = tx + DIR_VEC[d].dx;
				const cy = ty + DIR_VEC[d].dy;
				if (field.tileAt(cx, cy).counter) {
					const bx = cx + DIR_VEC[d].dx;
					const by = cy + DIR_VEC[d].dy;
					if (
						field.canEnter(bx, by, this.player) ||
						(bx === this.player.x && by === this.player.y)
					) {
						goalX = cx;
						goalY = cy;
					}
				}
			}
		}
		// 本棚や掲示板の裏からタップしたときは、表へ回りこむ
		const noBack =
			!!talk && goalX === tx && goalY === ty && field.hasBack(talk);
		if (
			talk &&
			Math.abs(tx - this.player.x) + Math.abs(ty - this.player.y) === 1 &&
			!(noBack && this.player.y === ty - 1)
		) {
			this.faceTo(this.player, tx, ty);
			this.talkFront();
			return;
		}
		const path = field.findPath(
			this.player.x,
			this.player.y,
			goalX,
			goalY,
			this.player,
			noBack,
		);
		if (!path) return;
		this.path = path;
		this.pathTalk = talk ?? null;
		this.marker = { x: tx, y: ty, t: this.time };
	}

	private updateCamera(): void {
		const field = this.field;
		if (!field) return;
		const { width, height } = this.screen;
		if (DIORAMA) {
			const p = boxPlacement(
				field,
				boxFor(field, this.player),
				width,
				height,
				this.player,
			);
			this.camX = p.camX;
			this.camY = p.camY;
			return;
		}
		const mw = field.w * TILE;
		const mh = field.h * TILE;
		const cx = this.player.fx * TILE + TILE / 2 - width / 2;
		const cy = this.player.fy * TILE + TILE / 2 - height / 2;
		// 画面下にメッセージ窓・ボタンが重なるので、少し上寄りに見せる
		const bias = Math.min(height * 0.12, TILE * 2);
		/*
		 * いちばん上の段には 出入り口が置かれることがある（町の北口は y=0）。
		 * そこが画面の上ぴったり、あるいは画面の外に出てしまうと、タップで歩いて行けない
		 * （スマホではブラウザのバーのすぐ下にもなる）。半マスぶん 余白をあける。
		 * とくに マップが画面より低いときは、上の bias をそのまま足すと
		 * マップごと上へ押し出されて、いちばん上の段が画面から消えていた
		 */
		const topPad = TILE / 2;
		/** マップが収まるとき、上下に残る余白（片側）。 */
		const slack = Math.max(0, (height - mh) / 2);
		this.camX =
			mw <= width ? (mw - width) / 2 : Math.max(0, Math.min(mw - width, cx));
		this.camY =
			mh <= height
				? // 収まるとき：真ん中から bias だけ上へ寄せる。ただし上の余白は
					// topPad を下回らせず、下がはみ出すほど（余白の合計を超えては）寄せない
					-Math.min(2 * slack, Math.max(topPad, slack - bias))
				: Math.max(-topPad, Math.min(mh - height + bias, cy + bias));
		this.camX = this.screen.snap(this.camX);
		this.camY = this.screen.snap(this.camY);
	}

	private render(): void {
		const ctx = this.screen.begin();
		const field = this.field;
		// 屋外マップは時間帯フラグ tod の色調（TOD_PRESETS）が tint / outside に優先する（DESIGN §4）
		const todFlag = field?.def.outdoor ? this.state.flags.tod : undefined;
		const tod = typeof todFlag === "string" ? TOD_PRESETS[todFlag] : undefined;
		ctx.fillStyle = tod?.outside ?? field?.def.outside ?? "#000";
		ctx.fillRect(0, 0, this.screen.width, this.screen.height);
		if (!field) return;
		if (DIORAMA) {
			renderDiorama(
				ctx,
				this.screen.width,
				this.screen.height,
				field,
				this.player,
				[...field.actors, this.player],
				this.time,
				typeof this.state.flags.tod === "string"
					? this.state.flags.tod
					: undefined,
				field.def.dark
					? {
							amount: field.def.dark,
							radius: this.state.flags.flashlight
								? LIGHT_RADIUS_FLASHLIGHT
								: LIGHT_RADIUS,
						}
					: undefined,
			);
			return;
		}
		const ox = this.camX;
		const oy = this.camY;
		field.drawBelow(ctx, ox, oy);
		if (this.marker && this.path.length) {
			const a = 0.5 + 0.3 * Math.sin((this.time - this.marker.t) / 120);
			ctx.strokeStyle = `rgba(255,255,255,${a})`;
			ctx.lineWidth = 1;
			ctx.strokeRect(
				this.marker.x * TILE - ox + 1.5,
				this.marker.y * TILE - oy + 1.5,
				TILE - 3,
				TILE - 3,
			);
		}
		// 上の層とキャラは行の順に重ねる（北の木や棚はキャラの奥・同じ行と南の物は手前）
		const actors = [...field.actors, this.player];
		field.drawSorted(ctx, actors, ox, oy, this.time);
		// 本棚や掲示板の裏にほとんど隠れた人は薄く見せる（キリコも町の人も）。
		// 向きの無い絵（置き物・看板）は地形の一部なので透かさない。奥から順に渡す
		field.drawHidden(
			ctx,
			actors
				.filter((a) => a === this.player || !a.still)
				.sort((a, b) => a.fy - b.fy),
			ox,
			oy,
			this.time,
		);
		// 雰囲気（DESIGN §3）：イベントのあと・UI の前に、色 → 暗闇 → 粒 の順で重ねる
		const def = field.def;
		const passes: TintPass[] | undefined =
			tod?.passes ?? (def.tint ? [{ color: def.tint }] : undefined);
		if (passes) {
			for (const p of passes) {
				ctx.globalCompositeOperation = p.blend ?? "source-over";
				ctx.fillStyle = p.color;
				ctx.fillRect(0, 0, this.screen.width, this.screen.height);
			}
			ctx.globalCompositeOperation = "source-over";
		}
		// 深夜の屋外は、入ってから約60秒かけて黒がじわじわ深くなる（夜が深まる。気づくかどうかの速さで）
		if (todFlag === "shinya") {
			const creep = Math.min(
				0.28,
				((this.time - this.mapEnteredAt) / 60000) * 0.28,
			);
			if (creep > 0.005) {
				ctx.fillStyle = `rgba(0,0,5,${creep})`;
				ctx.fillRect(0, 0, this.screen.width, this.screen.height);
			}
		}
		// ビネット（画面端ほど黒が濃い。dark マップは穴あき暗闇と二重にしない。docs/night-fx.md §3）
		const vig = typeof todFlag === "string" ? VIGNETTE_BY_TOD[todFlag] : 0;
		if (vig && !def.dark) this.drawVignette(ctx, vig);
		if (def.dark) this.drawDark(ctx, def.dark);
		// 光源（MapDef.lights）：色調の上へ加算で光だまりを重ねる（ツクールの定番構成）
		const lightsAlpha =
			(typeof todFlag === "string" ? LIGHTS_BY_TOD[todFlag] : 0) ?? 0;
		if (def.lights && lightsAlpha > 0)
			this.drawLights(ctx, def.lights, lightsAlpha, todFlag as string);
		// 深夜はプレイヤーの足元に月明かり（可読性の守り）
		if (todFlag === "shinya") {
			ctx.globalCompositeOperation = "lighter";
			ctx.globalAlpha = MOON_GLOW.alpha;
			const stamp = this.glowFor(MOON_GLOW.r, MOON_GLOW.color);
			if (stamp)
				ctx.drawImage(
					stamp,
					this.player.fx * TILE + TILE / 2 - this.camX - stamp.width / 2,
					this.player.fy * TILE + TILE / 2 - this.camY - stamp.height / 2,
				);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = "source-over";
		}
		if (def.ambient)
			drawAmbient(
				ctx,
				def.ambient,
				this.time,
				ox,
				oy,
				this.screen.width,
				this.screen.height,
			);
	}

	// ───────────────── 夜の光（ビネット・光源） ─────────────────

	/** ビネットを重ねる（全強度キャッシュ × globalAlpha）。 */
	private drawVignette(ctx: CanvasRenderingContext2D, alpha: number): void {
		const { width, height } = this.screen;
		if (width <= 0 || height <= 0) return;
		let buf = this.vignetteCanvas;
		if (!buf || buf.width !== width || buf.height !== height) {
			buf = document.createElement("canvas");
			buf.width = width;
			buf.height = height;
			const g = buf.getContext("2d");
			if (!g) return;
			const r = 0.5 * Math.hypot(width, height);
			const grad = g.createRadialGradient(
				width / 2,
				height / 2,
				0,
				width / 2,
				height / 2,
				r,
			);
			grad.addColorStop(0.55, `rgba(${VIGNETTE_RGB},0)`);
			grad.addColorStop(0.8, `rgba(${VIGNETTE_RGB},0.45)`);
			grad.addColorStop(1, `rgba(${VIGNETTE_RGB},1)`);
			g.fillStyle = grad;
			g.fillRect(0, 0, width, height);
			this.vignetteCanvas = buf;
		}
		ctx.globalAlpha = alpha;
		ctx.drawImage(buf, 0, 0);
		ctx.globalAlpha = 1;
	}

	/** 光だまりのスタンプ（半径 r タイル・色 #rrggbb）。中心 α0.48 → 半分 α0.18 → ふち 0。 */
	private glowFor(r: number, color: string): HTMLCanvasElement | null {
		const key = `${r}:${color}`;
		const hit = this.glowStamps.get(key);
		if (hit) return hit;
		const size = Math.ceil(r * TILE * 2);
		const c = document.createElement("canvas");
		c.width = c.height = size;
		const g = c.getContext("2d");
		if (!g) return null;
		const grad = g.createRadialGradient(
			size / 2,
			size / 2,
			0,
			size / 2,
			size / 2,
			size / 2,
		);
		grad.addColorStop(0, `${color}7a`);
		grad.addColorStop(0.5, `${color}2e`);
		grad.addColorStop(1, `${color}00`);
		g.fillStyle = grad;
		g.fillRect(0, 0, size, size);
		this.glowStamps.set(key, c);
		return c;
	}

	/** マップの光源（MapDef.lights）を加算で描く。alpha は時間帯の点灯強度。 */
	private drawLights(
		ctx: CanvasRenderingContext2D,
		lights: NonNullable<MapDef["lights"]>,
		alpha: number,
		tod: string,
	): void {
		ctx.globalCompositeOperation = "lighter";
		for (let i = 0; i < lights.length; i++) {
			const l = lights[i];
			if (l.only && !l.only.split(",").includes(tod)) continue;
			const stamp = this.glowFor(l.r, l.color ?? "#ffcc88");
			if (!stamp) continue;
			const px = (l.x + 0.5) * TILE - this.camX;
			const py = (l.y + 0.5) * TILE - this.camY;
			if (
				px < -l.r * TILE ||
				py < -l.r * TILE ||
				px > this.screen.width + l.r * TILE ||
				py > this.screen.height + l.r * TILE
			)
				continue;
			// 灯りのゆらぎ（ステートレス。ambient と同じ思想）
			ctx.globalAlpha = alpha * (1 + 0.05 * Math.sin(this.time / 300 + i * 7));
			ctx.drawImage(stamp, px - stamp.width / 2, py - stamp.height / 2);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-over";
	}

	// ───────────────── 暗闇（MapDef.dark） ─────────────────

	/**
	 * 光の抜き型：半径（radius + ふち）の円。中心〜radius は不透明、ふちの LIGHT_EDGE で
	 * 透明へ落ちる放射グラデーション。destination-out で暗闇から抜く。
	 */
	private stampFor(radius: number): HTMLCanvasElement | null {
		if (this.lightStamp?.radius === radius) return this.lightStamp.canvas;
		const r1 = (radius + LIGHT_EDGE) * TILE;
		const c = document.createElement("canvas");
		c.width = c.height = Math.ceil(r1 * 2);
		const g = c.getContext("2d");
		if (!g) return null;
		const grad = g.createRadialGradient(r1, r1, radius * TILE, r1, r1, r1);
		grad.addColorStop(0, "rgba(0,0,0,1)");
		grad.addColorStop(1, "rgba(0,0,0,0)");
		g.fillStyle = grad;
		g.fillRect(0, 0, c.width, c.height);
		this.lightStamp = { canvas: c, radius };
		return c;
	}

	/**
	 * roguelike のフォグ2層方式の簡略版：画面ぜんぶを濃さ dark で黒く塗った作業キャンバスから、
	 * プレイヤーを中心にした光の抜き型で丸く抜いて、画面へ重ねる。
	 * 作業キャンバスは画面と同じ大きさ（変わったとき＝リサイズで作り直す）。
	 */
	private drawDark(ctx: CanvasRenderingContext2D, dark: number): void {
		const { width, height } = this.screen;
		// タブ非表示・リサイズ中は画面が0サイズになることがある（0サイズの drawImage は例外）
		if (width <= 0 || height <= 0) return;
		let buf = this.darkCanvas;
		if (!buf || buf.width !== width || buf.height !== height) {
			buf = document.createElement("canvas");
			buf.width = width;
			buf.height = height;
			this.darkCanvas = buf;
		}
		const g = buf.getContext("2d");
		if (!g) return;
		g.globalCompositeOperation = "source-over";
		g.clearRect(0, 0, width, height);
		g.fillStyle = `rgba(0,0,0,${Math.min(1, Math.max(0, dark))})`;
		g.fillRect(0, 0, width, height);
		const radius = this.state.flags.flashlight
			? LIGHT_RADIUS_FLASHLIGHT
			: LIGHT_RADIUS;
		const stamp = this.stampFor(radius);
		if (stamp) {
			const px = this.player.fx * TILE + TILE / 2 - this.camX;
			const py = this.player.fy * TILE + TILE / 2 - this.camY;
			g.globalCompositeOperation = "destination-out";
			g.drawImage(stamp, px - stamp.width / 2, py - stamp.height / 2);
		}
		ctx.drawImage(buf, 0, 0);
	}

	// ───────────────── スクリプト ─────────────────

	private runEnter(): void {
		const def = this.field?.def;
		if (def?.onEnter) {
			void this.runScript(async (s) => {
				await def.onEnter?.(s);
			}).then(() => this.checkAuto());
		} else {
			this.checkAuto();
		}
	}

	/** 条件を満たした自動イベントを始める。 */
	private checkAuto(): void {
		const field = this.field;
		if (!field || this.scriptDepth > 0) return;
		const auto = field.actors.find(
			(a) => a.def?.trigger === "auto" && a.def.run,
		);
		if (auto?.def) void this.runEvent(auto.def);
	}

	private async runEvent(e: EventDef): Promise<void> {
		const mapId = this.field?.def.id;
		// ほかのスクリプトが動いている間は始めない（二重起動の防止）
		if (!e.run || !mapId || this.scriptDepth > 0) return;
		await this.runScript(async (s) => {
			await e.run?.(s);
			if (e.once) this.state.flags[`done:${mapId}:${e.id}`] = true;
		});
	}

	/** スクリプトを実行する。入れ子（メニュー→レコード再生など）にも対応。 */
	async runScript(fn: Script): Promise<void> {
		this.scriptDepth++;
		this.input.clearField();
		try {
			await fn(this.story);
		} catch (e) {
			if (e instanceof ResetToTitle) {
				this.scriptDepth = 0;
				this.onReset?.();
				return;
			}
			console.error("[script]", e);
		} finally {
			if (this.scriptDepth > 0) this.scriptDepth--;
		}
		if (this.scriptDepth === 0 && this.running) {
			this.msg.close();
			this.refreshActors();
			this.input.clearField();
			// イベントの途中で保存すると続き（フラグなど）が失われるので、終わってから保存する
			if (this.autosavePending) {
				this.autosavePending = false;
				writeSave(this.state);
			}
			this.checkAuto();
		}
	}

	// ───────────────── 演出 ─────────────────

	async fadeOut(ms = 300, color = "#000"): Promise<void> {
		this.fadeEl.style.background = color;
		this.fadeEl.style.transition = `opacity ${ms}ms linear`;
		await nextFrame();
		this.fadeEl.style.opacity = "1";
		await sleep(ms);
	}

	async fadeIn(ms = 300): Promise<void> {
		this.fadeEl.style.transition = `opacity ${ms}ms linear`;
		await nextFrame();
		this.fadeEl.style.opacity = "0";
		await sleep(ms);
	}

	toast(text: string): void {
		this.toastEl.textContent = text;
		this.toastEl.classList.remove("shown");
		void this.toastEl.offsetWidth;
		this.toastEl.classList.add("shown");
	}

	portraitOf(who: string): PortraitSpec | null {
		const c = this.data.cast[who];
		if (!c?.portrait) return null;
		return {
			id: c.id,
			name: c.name,
			color: c.color,
			...c.portrait,
			side: c.portrait.side ?? "right",
		};
	}

	/** セリフを出す（ui/menu.ts からも使う）。 */
	say(who: string | null, text: string, opt: SayOptions = {}): Promise<void> {
		const c = who ? this.data.cast[who] : undefined;
		if (who && !c) console.warn(`[say] 未登録のキャラ ${who}`);
		const voice = c?.voice;
		return this.msg.show({
			name: opt.name ?? c?.name ?? (who ? who : undefined),
			color: c?.color,
			text,
			portrait: opt.noPortrait || !who ? null : this.portraitOf(who),
			pace: (opt.pace ?? c?.pace) === "slow" ? "slow" : undefined,
			onShow:
				voice && settings.voice && !opt.noVoice
					? (leadMs) =>
							this.audio.speak(
								text,
								{ ...voice, emotion: opt.emotion ?? voice.emotion },
								leadMs,
							)
					: undefined,
		});
	}

	/**
	 * レコード再生演出（Story.record）：回転ノイズの SE をループで鳴らし、
	 * 本文を1枚ずつメッセージ窓で読む（レコードの声で。ボイス OFF なら文字だけ）。
	 * 名前欄には日付を出す。読み終えたらノイズを止めて針の上がる音
	 * （data/sfx.ts に "record"＝回転ノイズ・"needle"＝針の音 を用意しておく）。
	 * opt.trueVoice は終点の一斉再生専用：レコードに trueVoice があれば
	 * 「本人の声」で読む（無いレコードはふつうの voice のまま。DESIGN §6）。
	 */
	async playRecord(id: string, opt?: { trueVoice?: boolean }): Promise<void> {
		const rec = this.data.records[id];
		if (!rec) {
			console.warn(`[record] レコード ${id} がありません`);
			return;
		}
		const voice = (opt?.trueVoice ? rec.trueVoice : undefined) ?? rec.voice;
		this.msg.close();
		const stopNoise = this.audio.seLoop("record");
		try {
			for (const line of rec.lines) {
				await this.msg.show({
					name: rec.date,
					text: line,
					portrait: null,
					// 「……」で始まる行も、声は「……」を出しきってから（セリフと同じ）
					onShow:
						voice && settings.voice
							? (leadMs) => this.audio.speak(line, voice, leadMs)
							: undefined,
				});
			}
		} finally {
			stopNoise();
			this.audio.se("needle");
			this.msg.hideWindow();
		}
	}

	private actorFor(target: string): Actor | undefined {
		if (target === "player") return this.player;
		return this.field?.actor(target);
	}

	/** Story API（シナリオから使う命令）。 */
	readonly story: Story = this.makeStory();

	private makeStory(): Story {
		const game = this;
		return {
			get state(): GameState {
				return game.state;
			},
			say: (who, text, opt) => this.say(who, text, opt),
			narrate: (text) => this.say(null, text),
			choose: async (options, opt) => {
				const n = await this.choice.choose(options, opt?.cancel, (name) =>
					this.audio.se(name),
				);
				return n;
			},
			wait: (ms) => {
				this.msg.hideWindow();
				return sleep(ms);
			},
			fadeOut: (ms, color) => this.fadeOut(ms, color),
			fadeIn: (ms) => this.fadeIn(ms),
			bgm: (name) => this.audio.bgm(name),
			se: (name, opt) => this.audio.se(name, opt),
			record: (id, opt) => this.playRecord(id, opt),
			note: async (id) => {
				const def = this.data.notes[id];
				if (!def) {
					console.warn(`[note] ノート ${id} がありません`);
					return;
				}
				const key = `note_${id}`;
				if (this.state.flags[key]) return; // 二度目からは何もしない
				this.state.flags[key] = true;
				// メッセージ窓でなく、地名と同じ小さなトーストで知らせる（DESIGN §6.5）
				this.toast(`ノートに　書きとめた──『${def.title}』`);
			},
			flag: (name) => this.state.flags[name],
			set: (name, value = true) => {
				this.state.flags[name] = value;
				// 時間帯が変わったら、時間帯の曲の地区では曲もかえる
				if (name === "tod" && this.field?.def.bgm === "@tod")
					this.audio.bgm(this.resolveBgm("@tod"));
			},
			warp: async (mapId, x, y, dir, opt) => {
				const fade = opt?.fade ?? true;
				if (opt?.se) this.audio.se(opt.se);
				this.msg.close();
				if (fade) await this.fadeOut(250);
				await this.loadMap(mapId, x, y, dir ?? this.player.dir);
				this.autosavePending = true;
				if (fade) await this.fadeIn(250);
				const def = this.field?.def;
				if (def?.onEnter) await def.onEnter(this.story);
			},
			move: async (target, route, opt) => {
				const a = this.actorFor(target);
				if (!a) {
					console.warn(`[move] ${target} がいません`);
					return;
				}
				const ms = WALK_MS / (opt?.speed ?? 1);
				const map: Record<string, Dir> = {
					u: "up",
					d: "down",
					l: "left",
					r: "right",
				};
				for (const ch of route) {
					if (ch === "w") {
						await sleep(250);
						continue;
					}
					const face = map[ch.toLowerCase()];
					if (!face) continue;
					if (ch === ch.toUpperCase()) {
						a.dir = face;
						await sleep(120);
						continue;
					}
					const v = DIR_VEC[face];
					const nx = a.x + v.dx;
					const ny = a.y + v.dy;
					if (!opt?.through && this.field && !this.field.canEnter(nx, ny, a)) {
						a.dir = face;
						await sleep(ms);
						continue;
					}
					await a.walk(face, ms);
				}
				if (a === this.player) {
					this.state.x = a.x;
					this.state.y = a.y;
					this.state.dir = a.dir;
				}
			},
			face: (target, dir) => {
				const a = this.actorFor(target);
				if (!a) return;
				if (dir === "player") this.faceTo(a, this.player.x, this.player.y);
				else a.dir = dir;
			},
			show: (id) => {
				const mapId = this.field?.def.id ?? "";
				delete this.state.flags[this.hiddenKey(mapId, id)];
				this.refreshActors();
			},
			hide: (id) => {
				const mapId = this.field?.def.id ?? "";
				this.state.flags[this.hiddenKey(mapId, id)] = true;
				this.refreshActors();
			},
			place: (id, x, y, dir) => {
				const a = this.actorFor(id);
				if (!a) return;
				a.setPos(x, y);
				if (dir) a.dir = dir;
			},
			give: (id, n = 1) => {
				this.state.items[id] = (this.state.items[id] ?? 0) + n;
			},
			take: (id, n = 1) => {
				const have = this.state.items[id] ?? 0;
				if (have < n) return false;
				if (have === n) delete this.state.items[id];
				else this.state.items[id] = have - n;
				return true;
			},
			has: (id) => this.state.items[id] ?? 0,
			shake: async (ms = 400) => {
				this.msg.hideWindow();
				document.body.classList.add("shake");
				await sleep(ms);
				document.body.classList.remove("shake");
			},
			flash: async (color = "#fff", ms = 200) => {
				this.msg.hideWindow();
				const f = el("div", { class: "flash" });
				f.style.background = color;
				this.ui.appendChild(f);
				await sleep(ms);
				f.remove();
			},
			chapter: (label, title) => this.scenes.chapter(this, label, title),
			saveMenu: async () => {
				await this.say(null, "ここまでの　きろくを　のこしますか？");
				const n = await this.story.choose(["のこす", "やめておく"], {
					cancel: 1,
				});
				if (n === 0) {
					const ok = writeSave(this.state);
					this.audio.se(ok ? "save" : "cancel");
					await this.say(
						null,
						ok
							? "きろくを　のこしました。"
							: "きろくできませんでした……（ブラウザの保存領域が使えないようです）",
					);
				}
			},
			ending: (opt) => {
				// かいいノートの収集率をまとめカードへ自動で足す（DESIGN §6.5「ノート　x/y」）。
				// まとめの中身はシナリオ側のデータなので、すでに「ノート」の行があれば足さない
				let o = opt;
				const noteIds = Object.keys(this.data.notes);
				if (opt?.summary?.sections.length && noteIds.length) {
					const has = opt.summary.sections.some((sec) =>
						sec.lines.some((l) => l.includes("ノート")),
					);
					if (!has) {
						const found = noteIds.filter(
							(id) => this.state.flags[`note_${id}`],
						).length;
						o = {
							...opt,
							summary: {
								sections: [
									...opt.summary.sections,
									{
										title: "かいいノート",
										lines: [`ノート　${found}/${noteIds.length}`],
									},
								],
							},
						};
					}
				}
				return this.scenes.ending(this, o);
			},
		};
	}
}
