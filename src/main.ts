// 起動：画面・入力・音・ゲームを組み立て、タイトル → 本編 → タイトル… を回す。

import "./style.css";
import { data } from "./data";
import { GameAudio } from "./engine/audio";
import type { GameState } from "./engine/defs";
import { Game } from "./engine/game";
import { Input } from "./engine/input";
import { Screen } from "./engine/screen";
import { mountHud } from "./ui/hud";
import { fieldMenu } from "./ui/menu";
import { chapterCard, endingRoll } from "./ui/scenes";
import { showTitle } from "./ui/title";

const app = document.getElementById("app");
if (!app) throw new Error("#app がありません");

const screen = new Screen(app);
const ui = document.createElement("div");
ui.id = "ui";
app.appendChild(ui);

const input = new Input();
input.bindField(screen.canvas);
const audio = new GameAudio(data.bgm, data.sfx);
input.onAnyInput = () => {
	const first = !audio.unlocked;
	audio.unlock();
	if (first) audio.preloadSe(["cursor", "decide", "cancel", "door"]);
};

const hud = mountHud(app, input);
const game = new Game(data, screen, input, audio, ui);
// 開発用：コンソールから game を触れるようにする（pnpm dev のときだけ）
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;

game.scenes = {
	menu: fieldMenu,
	chapter: chapterCard,
	ending: endingRoll,
};

// 会話・メニュー中は十字キーと A/B を隠す（タップでどこでも送れる）
const syncHud = () => {
	hud.classList.toggle("modal", input.busy);
	requestAnimationFrame(syncHud);
};
syncHud();

// iOS Safari の拡大ジェスチャ・長押しメニューを止める
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("contextmenu", (e) => e.preventDefault());

// iOS は user-scalable=no を聞かず、すばやく 2 回たたくと拡大してしまう。
// 拡大するとピンチも止めてあるので戻せなくなる。2 回目のタップの既定動作を止める
// （操作はすべて pointer イベントで受けているので、click が出なくても困らない）
let lastTouchEnd = 0;
document.addEventListener(
	"touchend",
	(e) => {
		const now = e.timeStamp;
		if (now - lastTouchEnd < 350) e.preventDefault();
		lastTouchEnd = now;
	},
	{ passive: false },
);

// それでも拡大されたら（ブラウザ独自の操作など）、viewport を書き直して等倍に戻す
const viewportMeta = document.querySelector<HTMLMetaElement>(
	'meta[name="viewport"]',
);
const resetZoom = () => {
	const vv = window.visualViewport;
	if (!viewportMeta || !vv || vv.scale <= 1.01) return;
	const content = viewportMeta.content;
	viewportMeta.content = `${content}, minimum-scale=1`;
	requestAnimationFrame(() => {
		viewportMeta.content = content;
	});
};
window.visualViewport?.addEventListener("resize", resetZoom);

/**
 * 開発用：URL でタイトルを飛ばして好きな場所から始める（pnpm dev のときだけ）。
 * 例 `?map=kura&x=4&y=5&dir=up&flags={"flashlight":true}`
 * `&items=rec_a:1` で持ちもの（大事なもの）を決め打ちする。
 * 端末の日時は `&date=MMDD&time=HHMM&wday=0〜6`（data/weekday.ts）。
 */
const devStart = (): GameState | null => {
	if (!import.meta.env.DEV) return null;
	const q = new URLSearchParams(location.search);
	const map = q.get("map");
	if (!map) return null;
	const st = game.newState();
	st.mapId = map;
	st.x = Number(q.get("x") ?? st.x);
	st.y = Number(q.get("y") ?? st.y);
	st.dir = (q.get("dir") as GameState["dir"]) ?? st.dir;
	try {
		Object.assign(st.flags, JSON.parse(q.get("flags") ?? "{}"));
	} catch {
		console.warn("[dev] flags の JSON が読めません");
	}
	// 持ちもの（items=rec_a:1,omamori:1。数を省くと 1、0 で なくす）
	for (const kv of q.get("items")?.split(",") ?? []) {
		const [id, n] = kv.split(":");
		if (!id) continue;
		if (!data.items[id]) {
			console.warn(`[dev] どうぐ "${id}" が ありません`);
			continue;
		}
		const k = n === undefined ? 1 : Math.floor(Number(n));
		if (k > 0) st.items[id] = k;
		else delete st.items[id];
	}
	return st;
};

const loop = async () => {
	let first = devStart();
	for (;;) {
		hud.classList.add("hidden");
		const state = first ?? (await showTitle(game));
		first = null;
		hud.classList.remove("hidden");
		await new Promise<void>((resolve) => {
			game.onReset = () => {
				game.stop();
				resolve();
			};
			void game.start(state);
		});
	}
};

void loop();
