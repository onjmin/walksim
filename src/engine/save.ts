// セーブデータ（1スロット・localStorage）。

import type { GameState } from "./defs";

// rpg と同じオリジン（onjmin.github.io）で公開するので、キーは walksim 専用にする
const KEY = "walksim/save";
const VERSION = 1;

type SaveFile = { v: number; savedAt: number; state: GameState };

export const hasSave = (): boolean => {
	try {
		return !!localStorage.getItem(KEY);
	} catch {
		return false;
	}
};

export const writeSave = (state: GameState): boolean => {
	// デバッグルームから飛んだ状態は記録しない（本物のセーブを上書きしない）
	if (state.flags.debug) return true;
	try {
		const file: SaveFile = { v: VERSION, savedAt: Date.now(), state };
		localStorage.setItem(KEY, JSON.stringify(file));
		return true;
	} catch {
		return false;
	}
};

export const readSave = (): { state: GameState; savedAt: number } | null => {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		const file = JSON.parse(raw) as SaveFile;
		if (file.v !== VERSION || !file.state) return null;
		return { state: file.state, savedAt: file.savedAt };
	} catch {
		return null;
	}
};

export const deleteSave = (): void => {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// 何もしない
	}
};

// ───────────────── 永続クリア印 ─────────────────
// 周回外のクリアフラグ keep_clear（DESIGN §7）。セーブとは別枠のキーに置くので、
// 「はじめから」でセーブを上書きしても消えない。エンディングのスクリプトが立てる。

const CLEAR_KEY = "walksim/keep_clear";

export const markClear = (): void => {
	try {
		localStorage.setItem(CLEAR_KEY, "1");
	} catch {
		// 保存できなくても遊べる
	}
};

export const hasClearMark = (): boolean => {
	try {
		return !!localStorage.getItem(CLEAR_KEY);
	} catch {
		return false;
	}
};
