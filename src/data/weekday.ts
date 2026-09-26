// 遊んでいる端末の日時・曜日（0=日〜6=土）。
// 夢の中のにぃちぇは毎日「今日　日曜日だニィ！」と言うが、端末が本当に日曜のときだけ
// 不安になる（曜日ギミック）。それだけが「外」の日時を見る。
// 開発中は URL の &date=MMDD・&time=HHMM・&wday=0〜6 で決め打ちできる（pnpm dev のときだけ）。

/** 端末の日時（月は 1〜12・曜日は 0=日〜6=土）。 */
export type Now = {
	y: number;
	m: number;
	d: number;
	h: number;
	mi: number;
	w: number;
};

/** 端末の日時。開発中は &date=MMDD・&time=HHMM・&wday=0〜6 で決め打ち（pnpm dev のときだけ）。 */
export const now = (): Now => {
	const t = new Date();
	const n: Now = {
		y: t.getFullYear(),
		m: t.getMonth() + 1,
		d: t.getDate(),
		h: t.getHours(),
		mi: t.getMinutes(),
		w: t.getDay(),
	};
	if (import.meta.env.DEV && typeof location !== "undefined") {
		const q = new URLSearchParams(location.search);
		const date = q.get("date");
		if (date !== null && /^\d{4}$/.test(date)) {
			n.m = Number(date.slice(0, 2));
			n.d = Number(date.slice(2));
		}
		const time = q.get("time");
		if (time !== null && /^\d{4}$/.test(time)) {
			n.h = Number(time.slice(0, 2));
			n.mi = Number(time.slice(2));
		}
		// 曜日は &date からは作らない（&wday だけで決める。前からの動きのまま）
		const w = q.get("wday");
		if (w !== null && /^[0-6]$/.test(w)) n.w = Number(w);
	}
	return n;
};

/** 端末の曜日（0=日〜6=土）。 */
export const weekday = (): number => now().w;
