// BGM を作る（node scripts/make-bgm.mjs）。src/data/bgm/<名前>.mml を書き出す。
//
// 作者判断（2026-09-27）で新しく作曲する：参考作品（静かな夜のローファイ／柔らかいチップチューン）の空気。
// 旧曲（rpg・roguelike・名無し155 の曲）のうち物語に結びついた ending / secret / kowareta は残す。
// 手打ちの MML を数えまちがえないよう、和音・旋律を「音名と長さ」の並びで書いて組み立て、
// トラックの長さ（1ループ）が全部そろっているかをここで検算する。
//
// 書式: 音は "C4" "F#3" "Bb5"、和音は ["Gb3","Bb3","Db4","F4"]、休符は null。
// 長さは MML の長さ（"1" "2" "4." "8" …）。1小節 = 192 ステップ（dtm の DEFAULT_STEPS_PER_BAR）。

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/data/bgm");

const BAR = 192;
const steps = (len) => {
	const m = /^(\d+)(\.*)$/.exec(len);
	if (!m) throw new Error(`長さが読めない: ${len}`);
	let s = Math.round(BAR / Number(m[1]));
	for (let i = 0; i < m[2].length; i++) s = Math.round(s * 1.5);
	return s;
};

const NOTE = { C: "c", D: "d", E: "e", F: "f", G: "g", A: "a", B: "b" };
/** "F#3" → "o3f+"、"Bb4" → "o4a+"（フラットは下の音の + に直す）。 */
const pitch = (p) => {
	const m = /^([A-G])([#b]?)(\d)$/.exec(p);
	if (!m) throw new Error(`音名が読めない: ${p}`);
	const order = ["C", "D", "E", "F", "G", "A", "B"];
	let [_, n, acc, o] = m;
	let oct = Number(o);
	if (acc === "b") {
		// 半音下：Cb は1つ下のオクターブの B
		const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[n] - 1;
		if (semis < 0) return `o${oct - 1}b`;
		const names = ["c", "c+", "d", "d+", "e", "f", "f+", "g", "g+", "a", "a+", "b"];
		return `o${oct}${names[semis]}`;
	}
	void order;
	return `o${oct}${NOTE[n]}${acc === "#" ? "+" : ""}`;
};

/** [[音 | 和音 | null, 長さ], …] を MML の本文に。長さの合計（ステップ）も返す。 */
const seq = (events) => {
	let body = "";
	let total = 0;
	for (const [p, len] of events) {
		total += steps(len);
		if (p === null) body += `r${len}`;
		else if (Array.isArray(p)) body += `[${p.map(pitch).join("")}]${len}`;
		else body += `${pitch(p)}${len}`;
	}
	return { body, total };
};

/** 1小節に和音を1つずつ、同じ刻み（rhythm）で鳴らす。 */
const comp = (chords, rhythm) =>
	chords.flatMap((ch) => rhythm.map((len) => [ch, len]));

/**
 * 曲を書き出す。tracks: [{ inst, v, events, rev, dly, pan, comp, width, eqlo, eqhi }]。
 * head: 曲全体の設定（volume・reverb 等）。
 */
const song = (name, { tempo, head, tracks, note }) => {
	const built = tracks.map((t) => ({ ...t, ...seq(t.events) }));
	const len = built[0].total;
	built.forEach((t, i) => {
		if (t.total !== len)
			throw new Error(`${name}: トラック${i} の長さ ${t.total} がトラック0 の ${len} とちがう`);
	});
	const opts = [
		`#inst=retro_game`,
		`#volume=${head.volume}`,
		`#reverb=${head.reverb ?? 30}`,
		`#reverbdecay=${head.decay ?? 18}`,
		`#reverbpredelay=${head.predelay ?? 20}`,
		`#mastercomp=${head.comp ?? 20}`,
		`#fadeout=15`,
		`#mode=simple`,
	];
	built.forEach((t, i) => {
		opts.push(`#t${i}inst=${t.inst}`);
		for (const [k, v] of Object.entries({
			comp: t.comp,
			width: t.width,
			rev: t.rev,
			pan: t.pan,
			dly: t.dly,
			eqlo: t.eqlo,
			eqhi: t.eqhi,
		}))
			if (v !== undefined) opts.push(`#t${i}${k}=${v}`);
	});
	const lines = [
		...note.map((l) => `// ${l}`),
		`${opts.join("")};`,
		...built.map((t, i) => `@${i}t${tempo}v${t.v}${t.body};`),
		"#end;",
	];
	writeFileSync(join(OUT, `${name}.mml`), `${lines.join("\n")}\n`);
	console.log(`${name}.mml  ${len / BAR} 小節 × ${built.length} トラック`);
};

// ───────────────── タイトル（夕方 17:03・原風景） ─────────────────

{
	const Gbmaj7 = ["Gb3", "Bb3", "Db4", "F4"];
	const Fm7 = ["F3", "Ab3", "C4", "Eb4"];
	const Ebm9 = ["Eb3", "Gb3", "Bb3", "Db4", "F4"];
	const Absus = ["Ab3", "Db4", "Eb4", "Gb4"];
	const Bbm7 = ["Bb3", "Db4", "F4", "Ab4"];
	const Ebm7 = ["Eb3", "Gb3", "Bb3", "Db4"];
	const Ab7 = ["Ab3", "C4", "Eb4", "Gb4"];
	const chords = [Gbmaj7, Fm7, Ebm9, Absus, Gbmaj7, Fm7, Bbm7];
	song("title", {
		tempo: 74,
		head: { volume: 22, reverb: 34, decay: 22 },
		note: [
			"タイトル「夕方の日常」— 変ニ長調のローファイ。エレピの7th（付点4分の刻み）・フレットレス・",
			"柔らかい矩形波の旋律（ディレイ）・オルゴールのきらめき。make-bgm.mjs の生成品",
		],
		tracks: [
			{
				inst: "Electric Piano 1",
				v: 62,
				rev: 24,
				width: 118,
				eqhi: -3,
				events: [
					...comp(chords, ["4.", "4.", "4"]),
					[Ebm7, "4."],
					[Ebm7, "8"],
					[Ab7, "4"],
					[Ab7, "4"],
				],
			},
			{
				inst: "Fretless Bass",
				v: 70,
				rev: 6,
				eqhi: -4,
				events: [
					["Gb2", "2."], ["Db3", "4"],
					["F2", "2."], ["C3", "4"],
					["Eb2", "2."], ["Bb2", "4"],
					["Ab2", "2."], ["Eb2", "4"],
					["Gb2", "2."], ["Db3", "4"],
					["F2", "2."], ["C3", "4"],
					["Bb2", "2."], ["F2", "4"],
					["Eb2", "2"], ["Ab2", "2"],
				],
			},
			{
				inst: "Lead 1 (square)",
				v: 44,
				rev: 18,
				dly: 22,
				eqhi: -6,
				pan: 58,
				events: [
					[null, "4"], ["F5", "8"], ["Ab5", "8"], ["Bb5", "4."], ["Ab5", "8"],
					["F5", "2"], [null, "4"], ["Eb5", "8"], ["F5", "8"],
					["Db5", "4."], ["Eb5", "8"], ["F5", "4"], ["Gb5", "8"], ["F5", "8"],
					["Eb5", "2."], [null, "4"],
					[null, "8"], ["Bb4", "8"], ["Db5", "8"], ["Eb5", "8"], ["F5", "4"], ["Ab5", "4"],
					["Ab5", "4."], ["F5", "8"], ["Eb5", "2"],
					["Db5", "4"], ["F5", "4"], ["Eb5", "4."], ["Db5", "8"],
					["Eb5", "2"], [null, "2"],
				],
			},
			{
				inst: "Music Box",
				v: 34,
				rev: 30,
				dly: 30,
				pan: 78,
				events: [
					[null, "1"],
					[null, "2"], ["Ab6", "4"], [null, "4"],
					[null, "1"],
					[null, "2."], ["Db7", "4"],
					[null, "1"],
					[null, "2"], ["C7", "4"], [null, "4"],
					[null, "1"],
					[null, "4"], ["Bb6", "4"], ["Ab6", "4"], [null, "4"],
				],
			},
		],
	});
}

// ───────────────── 日常（時間帯ごと・生活音の下にごく薄く） ─────────────────

// 夕方：ビブラフォンの分散和音と暖かいパッド（ヘ長調）
{
	const ch = [
		["Bb3", "D4", "F4", "A4"],
		["A3", "C4", "E4", "G4"],
		["G3", "Bb3", "D4", "F4"],
		["C4", "F4", "G4", "Bb4"],
	];
	const arp = (c) => [
		[c[0], "4"],
		[c[2], "4"],
		[c[3], "4"],
		[c[1], "4"],
	];
	song("amb_yu", {
		tempo: 66,
		head: { volume: 12, reverb: 38, decay: 26 },
		note: ["日常・夕方（生活音の下にごく薄く）— ヘ長調。ビブラフォンの分散和音と暖かいパッド"],
		tracks: [
			{
				inst: "Vibraphone",
				v: 50,
				rev: 30,
				dly: 18,
				events: [...ch, ...ch].flatMap((c, i) =>
					i % 2 ? [[c[3], "2"], [null, "2"]] : arp(c),
				),
			},
			{
				inst: "Pad 2 (warm)",
				v: 38,
				rev: 20,
				eqhi: -6,
				events: [...ch, ...ch].map((c) => [c, "1"]),
			},
		],
	});
}

// 宵：チェレスタのまばらな旋律と halo のパッド（変ホ長調）
{
	const ch = [
		["Ab3", "C4", "Eb4", "G4"],
		["G3", "Bb3", "D4", "F4"],
		["F3", "Ab3", "C4", "Eb4", "G4"],
		["Bb3", "Eb4", "F4", "Ab4"],
	];
	song("amb_yoru", {
		tempo: 60,
		head: { volume: 12, reverb: 40, decay: 28 },
		note: ["日常・宵（晩ごはんのあとの散歩）— 変ホ長調。チェレスタのまばらな旋律と halo のパッド"],
		tracks: [
			{
				inst: "Celesta",
				v: 46,
				rev: 34,
				dly: 26,
				pan: 60,
				events: [
					["G5", "4."], ["Eb5", "8"], ["C5", "2"],
					[null, "2"], ["D5", "4"], ["F5", "4"],
					["Eb5", "2."], [null, "4"],
					[null, "1"],
					["Bb4", "4"], ["C5", "4"], ["Eb5", "4"], ["G5", "4"],
					["F5", "2"], ["D5", "2"],
					["C5", "2."], [null, "4"],
					[null, "1"],
				],
			},
			{
				inst: "Pad 7 (halo)",
				v: 36,
				rev: 24,
				eqhi: -5,
				events: [...ch, ...ch].map((c) => [c, "1"]),
			},
		],
	});
}

// 深夜：パッドだけの長い和音と、2小節に1音こだまする矩形波（ニ短調）
{
	const ch = [
		["D3", "F3", "A3", "C4", "E4"],
		["Bb2", "D3", "F3", "A3", "E4"],
		["G2", "Bb2", "D3", "F3", "A3"],
		["A2", "D3", "E3", "G3"],
	];
	song("amb_shinya", {
		tempo: 54,
		head: { volume: 11, reverb: 44, decay: 34, predelay: 40 },
		note: [
			"日常・深夜（無人の町）— ニ短調。長いパッドと、2小節に1音だけこだまする矩形波。",
			"町の音が消えた静けさを埋めない（ほとんど鳴っていない）",
		],
		tracks: [
			{
				inst: "Pad 2 (warm)",
				v: 34,
				rev: 30,
				eqhi: -8,
				events: [...ch, ...ch].map((c) => [c, "1"]),
			},
			{
				inst: "Lead 1 (square)",
				v: 30,
				rev: 30,
				dly: 40,
				eqhi: -8,
				pan: 40,
				events: [
					[null, "2"], ["A5", "4"], [null, "4"],
					[null, "1"],
					[null, "2."], ["F5", "4"],
					[null, "1"],
					[null, "4"], ["E5", "4"], [null, "2"],
					[null, "1"],
					[null, "2"], ["D5", "2"],
					[null, "1"],
				],
			},
		],
	});
}

// 朝：カリンバと明るいパッド（ト長調）
{
	const ch = [
		["C4", "E4", "G4", "B4"],
		["D4", "F#4", "A4", "B4"],
		["B3", "D4", "F#4", "A4"],
		["E4", "G4", "B4", "D5", "F#5"],
	];
	song("amb_asa", {
		tempo: 72,
		head: { volume: 12, reverb: 30, decay: 18 },
		note: ["日常・朝（光と音がもどる）— ト長調。カリンバの分散和音と明るいパッド"],
		tracks: [
			{
				inst: "Kalimba",
				v: 52,
				rev: 22,
				dly: 12,
				events: [...ch, ...ch].flatMap((c) => [
					[c[0], "8"], [c[2], "8"], [c[1], "8"], [c[3], "8"],
					[c[2], "4"], [null, "4"],
				]),
			},
			{
				inst: "Pad 2 (warm)",
				v: 30,
				rev: 18,
				eqhi: -4,
				events: [...ch, ...ch].map((c) => [c, "1"]),
			},
		],
	});
}

// ───────────────── 怪異の地区 ─────────────────

// 回線の間（無人駅の待合室）：ナトリウム灯のラウンジ。遠い駅のチャイム（イ短調）
{
	const Am9 = ["A2", "G3", "B3", "C4", "E4"];
	const Fmaj7 = ["F2", "E3", "A3", "C4", "E4"];
	const Dm9 = ["D3", "F3", "A3", "C4", "E4"];
	const E7sus = ["E2", "D3", "A3", "B3", "E4"];
	const E7 = ["E2", "D3", "G#3", "B3", "E4"];
	song("hub", {
		tempo: 64,
		head: { volume: 18, reverb: 40, decay: 30 },
		note: [
			"回線の間（無人駅の待合室）— イ短調。エレピのラウンジと、遠い駅のチャイム。",
			"深夜2時の待合室。誰も来ない。旧 deep1（掘る動機の行進）の差し替え",
		],
		tracks: [
			{
				inst: "Electric Piano 2",
				v: 54,
				rev: 30,
				width: 120,
				eqhi: -4,
				events: [
					[Am9, "2."], [Am9, "4"],
					[Fmaj7, "2."], [Fmaj7, "4"],
					[Dm9, "2."], [Dm9, "4"],
					[E7sus, "2"], [E7, "2"],
					[Am9, "2."], [Am9, "4"],
					[Fmaj7, "2."], [Fmaj7, "4"],
					[Dm9, "2."], [Dm9, "4"],
					[E7sus, "1"],
				],
			},
			{
				inst: "Fretless Bass",
				v: 60,
				rev: 8,
				events: [
					["A2", "2."], ["E2", "4"],
					["F2", "2."], ["C3", "4"],
					["D2", "2."], ["A2", "4"],
					["E2", "2"], ["E2", "2"],
					["A2", "2."], ["E2", "4"],
					["F2", "2."], ["C3", "4"],
					["D2", "2."], ["A2", "4"],
					["E2", "1"],
				],
			},
			{
				inst: "Tubular Bells",
				v: 30,
				rev: 40,
				dly: 20,
				pan: 30,
				events: [
					["E5", "2"], ["C5", "2"],
					[null, "1"], [null, "1"], [null, "1"],
					[null, "1"], [null, "1"], [null, "1"], [null, "1"],
				],
			},
		],
	});
}

// 黄色い部屋：どこまでも同じ蛍光灯のうなり。半音でぶつかる和音が鳴りつづけ、ときどき場違いな1音
{
	const hum = ["C3", "C#3", "G3"];
	const hum2 = ["C3", "C#3", "G3", "F#4"];
	song("yellow", {
		tempo: 50,
		head: { volume: 16, reverb: 26, decay: 30 },
		note: [
			"黄色い部屋（Backrooms Level 0）— 蛍光灯のうなり。C と C# がぶつかる和音が途切れず鳴り、",
			"まれにオルゴールの場違いな1音（F#）。旋律は無い。旧 deep2 の差し替え",
		],
		tracks: [
			{
				inst: "Pad 3 (polysynth)",
				v: 40,
				rev: 18,
				eqhi: -6,
				events: [hum, hum, hum, hum2, hum, hum, hum, hum2].map((c) => [c, "1"]),
			},
			{
				inst: "Music Box",
				v: 30,
				rev: 30,
				dly: 30,
				pan: 88,
				events: [
					[null, "1"], [null, "1"], [null, "1"],
					[null, "2."], ["F#6", "4"],
					[null, "1"], [null, "1"],
					[null, "2"], ["C6", "4"], [null, "4"],
					[null, "1"],
				],
			},
		],
	});
}

// 過去ログの地層：古いレコードのようなオルゴールの短調と、合唱の低いドローン（イ短調）
song("kakolog", {
	tempo: 60,
	head: { volume: 16, reverb: 42, decay: 32 },
	note: [
		"過去ログの地層（地下の書庫廃墟）— イ短調。古いレコードのようなオルゴールの旋律と、",
		"合唱の低いドローン。旧 deep4（cyber_punk 16beat）の差し替え",
	],
	tracks: [
		{
			inst: "Music Box",
			v: 46,
			rev: 34,
			dly: 16,
			events: [
				["A4", "4"], ["C5", "4"], ["E5", "2"],
				["D5", "4."], ["C5", "8"], ["B4", "2"],
				["C5", "4"], ["A4", "4"], ["G4", "2"],
				["A4", "1"],
				["E5", "4"], ["F5", "4"], ["E5", "4"], ["D5", "4"],
				["C5", "2"], ["B4", "2"],
				["A4", "4"], ["B4", "4"], ["C5", "4"], ["E4", "4"],
				["A4", "1"],
			],
		},
		{
			inst: "Pad 4 (choir)",
			v: 32,
			rev: 30,
			eqhi: -8,
			events: [
				[["A2", "E3"], "1"], [["G2", "D3"], "1"], [["F2", "C3"], "1"], [["E2", "B2"], "1"],
				[["A2", "E3"], "1"], [["F2", "C3"], "1"], [["D2", "A2"], "1"], [["E2", "B2"], "1"],
			],
		},
	],
});

// 夕暮れの村：都節音階（E F A B C）の箏と尺八、低い持続音。終わらない夕暮れ
song("village", {
	tempo: 56,
	head: { volume: 16, reverb: 40, decay: 30 },
	note: [
		"夕暮れの村（深夜2時のはずが、ずっと夕暮れ）— 都節音階（E F A B C）の箏と尺八と、",
		"低い持続音。旧 sad（イ短調）の差し替え",
	],
	tracks: [
		{
			inst: "Koto",
			v: 56,
			rev: 26,
			dly: 12,
			events: [
				["E4", "8"], ["F4", "8"], ["A4", "4"], ["B4", "2"],
				["C5", "4"], ["B4", "8"], ["A4", "8"], ["F4", "2"],
				["E4", "2."], [null, "4"],
				[null, "1"],
				["A4", "8"], ["B4", "8"], ["C5", "4"], ["E5", "2"],
				["F5", "4"], ["E5", "8"], ["C5", "8"], ["B4", "2"],
				["A4", "4"], ["F4", "4"], ["E4", "2"],
				[null, "1"],
			],
		},
		{
			inst: "Shakuhachi",
			v: 40,
			rev: 34,
			pan: 44,
			events: [
				[null, "1"], [null, "1"],
				["B4", "2."], ["A4", "4"],
				["E4", "1"],
				[null, "1"], [null, "1"],
				["C5", "2"], ["B4", "2"],
				["E4", "1"],
			],
		},
		{
			inst: "Pad 2 (warm)",
			v: 28,
			rev: 20,
			eqhi: -8,
			events: Array.from({ length: 8 }, () => [["E2", "B2"], "1"]),
		},
	],
});
