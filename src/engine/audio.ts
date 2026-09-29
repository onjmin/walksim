// 音：BGM（MML を @onjmin/dtm で再生）・効果音（RPGEN の mp3）・セリフの読み上げ（koe UtauTTS）。
//
// - AudioContext は1つだけ。スマホの自動再生制限のため、最初のタップ／キー入力で作る（unlock）。
// - BGM と効果音は画面右上のボタンでまとめてミュートできる（settings.mute）。
//   ミュート中も「今どの曲のはずか」は覚えておき、解除したらその曲から鳴らす。
// - dtm のシーケンサは 0.5 秒以上止まる（タブ切替・画面ロック・重い処理）と黙って再生をやめる。
//   onStop で「自分で止めたのではない」停止を見分け、最後の位置から鳴らし直す。
// - 読み上げは既定 OFF（初回に約35MBの TTS データを取得するため）。設定で ON にする。
//   頭が欠けないよう、合成の最初のかたまり（＋声ごとの貯め。SPEECH_BUFFER_SEC）が出来てから
//   頭から鳴らす（awaitRender: "first-chunk"）。合成が追いつかなければ後ろをずらす（言葉は欠けない）。
//   鳴り始める時刻を返すので、メッセージ窓は文字送りをそこまで待たせる（ui/message.ts）。
// - dtm は重いので、最初の音が要るまで動的 import で遅らせる。
// - 大きさは測ったラウドネスでそろえる（data/loudness.ts）。既定の音量設定のとき、
//   BGM は曲ごとの #volume で、効果音は1音ずつの倍率で、声は声ごとの倍率で目標の大きさになる。
// - 効果音が鳴り始めたら、その音の本体が鳴り終わる時刻（waitMs。data/loudness.ts）まで「区切り待ち」にする。
//   文送り・選択肢の決定はそれまで効かない（seSettled / seHeld）。
//   連打で次の効果音が畳みかけて重ならないように。余韻までは待たせない。

import type { DtmStudio, MmlPlayback, SpeechHandle } from "@onjmin/dtm";
import {
	REF_VOLUME,
	SE_LOUDNESS,
	SE_UNMEASURED_GAIN,
	SE_WAIT,
	voiceGain,
} from "../data/loudness";
import { soundUrl } from "./assets";
import type { VoiceDef } from "./defs";
import { onSettingsChange, settings } from "./settings";

type Dtm = typeof import("@onjmin/dtm");

let dtmPromise: Promise<Dtm> | null = null;
const loadDtm = (): Promise<Dtm> => {
	dtmPromise ??= import("@onjmin/dtm");
	return dtmPromise;
};

/** MML ヘッダの `#volume=` （曲ごとの音量。ラウドネスをそろえてある。data/bgm.ts）。 */
const songVolume = (mml: string): number => {
	const m = /#volume=(\d+)/.exec(mml);
	return m ? Number(m[1]) : 50;
};

/**
 * 効果音の全体の音量。既定（60）で 1 倍＝素材ごとの倍率（seLevel）だけで目標の大きさになる。
 * 最大（100）で +4.4 dB（直す前と同じ幅）。
 */
const seGainOf = (v: number): number => v / REF_VOLUME.se;
/** 効果音ごとの倍率（data/loudness.ts）。測っていない音は直す前と同じ大きさ。 */
const seLevel = (name: string): number =>
	SE_LOUDNESS[name]?.[4] ?? SE_UNMEASURED_GAIN;
/** これより長い効果音（ジングル）は、同じ音が鳴っている間は重ねない。 */
const LONG_SE_SEC = 1;
/** 読み込みにこれより長くかかった効果音は鳴らさない（ずれた音は邪魔）。 */
const SE_LATE_MS = 600;
/** 区切り待ちのいちばん長い時間（1回の待ちはこれを超えない）。 */
const SE_HOLD_MAX_MS = SE_WAIT.jingleMaxMs;
/** 効果音を鳴らしてから次へ進めるまでの ms（測っていない音は待たない）。 */
const seWaitMs = (name: string): number => SE_LOUDNESS[name]?.[7] ?? 0;

/** dtm studio の出口の音量（createDtmStudio の masterVolume）。 */
const STUDIO_MASTER_VOLUME = 100;
/**
 * 歌声つき（studio.playSingingMML）の曲に掛ける倍率。同じ setVolume でも インストの
 * studio.play より 15.6 dB 小さく鳴るので、そのぶん上げて インストと同じ大きさにする
 * （2026-09 測定：ending の出口の RMS、インスト -27.1 dB・歌声つき -42.7 dB。setVolume は振幅に比例）。
 */
const SING_GAIN = 10 ** (15.6 / 20);

/** 前奏（`@0` が全休符で始まる4小節）がある曲は、2周目から前奏を飛ばす。 */
const hasIntro = (mml: string): boolean =>
	/@0\s*t\d+\s*v\d+\s*o\d\s*r1r1r1r1/.test(mml);

/**
 * コア音源（ボイスON時に prepareSpeech。DESIGN §5「声の音源」）。
 * キーワードは dtm の lyrics.ts（KOE_VOICEBANKS）のもの。
 * 2作目の 村の 仲間と 住人の 声（ロゼ・シヨ・アル・リノ）は 3作目に 出ないので 外した（STORY.md §5.97）。
 */
const CORE_VOICE_MODELS = ["uc", "rei", "tsukuyomi", "teto"] as const;

/**
 * カメオ音源（終盤専用。DESIGN §5）。コアと同時に落とすと重いので、
 * まちのどおりの 窓の 場面（転。data/maps/street.ts）が prepareCameoVoices を呼ぶ。
 * 用途は 朝のスレの住民の一言（と、レコードの trueVoice。いまは 使っていない）。
 */
const CAMEO_VOICE_MODELS = ["mgroid", "motroid", "nynroid"] as const;

/**
 * 効果音が MML か（data/sfx.ts の値。MML は `#volume=` ヘッダから始める約束にして
 * `rpgen:<id>`・URL と見分ける）。MML の効果音は dtm の内蔵シンセで鳴らす。
 */
const isMmlSe = (ref: string): boolean => ref.startsWith("#");

/** 固有名詞の読み（OpenJTalk が誤読するもの）。長いものから置き換える。 */
const READINGS: ReadonlyArray<readonly [string, string]> = [
	["蓄音キリコ", "ちくねキリコ"],
	["束音ロゼ", "たばねロゼ"],
	["重音テト", "かさねテト"],
	["革命シヨ", "かくめいしよ"],
	["蓄音", "ちくね"],
	["束音", "たばね"],
	["重音", "かさね"],
	["春音", "はるね"],
	["吾輩", "わがはい"],
	["おーぷん2ちゃんねる", "おーぷんにちゃんねる"],
	["おんJ", "おんジェイ"],
	["なんJ", "なんジェイ"],
	["きさらぎ駅", "きさらぎえき"],
	["八尺様", "はっしゃくさま"],
	["供養", "くよう"],
	["LV", "レベル"],
	["Lv", "レベル"],
];

/**
 * セリフ本文 → 読み上げ用の文。読めるものが残らなければ null（声なしで文字だけ出す）。
 * dtm の調査（planSpeech のモーラ列の実測）に基づく。
 */
export const speechText = (raw: string): string | null => {
	let s = raw.normalize("NFKC");
	for (const [from, to] of READINGS) s = s.replaceAll(from, to);
	s = s
		.replace(/[（(][^）)]*[）)]/g, "") // ト書き（…）は読まない
		.replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu, "")
		.replace(/(^|[^A-Za-z])[wW]+(?=$|[^A-Za-z])/g, "$1、") // 草w / www（笑い）→ 間
		.replace(/草{2,}/g, "")
		.replace(/[♪♫☆★♡♥※→←↑↓]/g, "")
		.replace(/[「」『』【】［］<>＜＞]/g, "、")
		.replace(/[…‥]+|・{2,}|\.{2,}/g, "、")
		.replace(/[~〜]+/g, "ー")
		.replace(/\s+/g, "")
		.replace(/、{2,}/g, "、")
		.replace(/^[、\s]+|[、\s]+$/g, "")
		.trim();
	if (
		!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9]/u.test(s)
	)
		return null;
	return s;
};

/**
 * 読み上げを鳴らし始める前に合成しておく秒数（dtm の minBufferSec。最初のモーラから）。
 * 最初のかたまりは数モーラしかないので、合成が再生に追いつかないと行の途中に間が空く
 * （dtm が後ろをずらす）。少し貯めてから鳴らすと減る。合成の遅い roze は多めにする。
 * 鳴り出しはそのぶん遅れる（メッセージ窓の文字送りは声の頭まで待つ。ui/message.ts）。
 */
const SPEECH_BUFFER_SEC: Readonly<Record<string, number>> = { roze: 0.4 };
/** {@link SPEECH_BUFFER_SEC} に無い声の貯め（秒）。 */
const SPEECH_BUFFER_DEFAULT_SEC = 0.2;

/** 読み上げの鳴り始め（{@link GameAudio.speak} の started）。 */
export type SpeechStart = {
	/** 最初のモーラが鳴る AudioContext の時刻（秒）。 */
	startTime: number;
	/** その音が聞こえる時刻（performance.now の時計、ms。出力の遅れを含む）。 */
	at: number;
	/** 声の長さ（秒。合成待ちでずれた間は含まない）。 */
	durationSec: number;
	/**
	 * 声が鳴り終わって聞こえる見込みの時刻（performance.now の時計、ms）。合成が遅れて
	 * 後ろがずれる（dtm の shiftSec）と延び、次のかたまりを待って止まっている間
	 * （dtm の position() が進まない間）も延びるので、読むたびに今の値を返す。
	 */
	endAt: () => number;
};

/** {@link GameAudio.speak} の戻り値。 */
export type Speaking = {
	/** 止める（準備中なら準備ごと中断）。 */
	stop: () => void;
	/**
	 * 鳴り始める時刻が決まったら解決する。鳴らない（失敗・鳴る前に止めた）ときは null。
	 * 読み上げない（OFF・読めない本文）ときは無い。
	 */
	started?: Promise<SpeechStart | null>;
};

/** いまのゲームの音（{@link GameAudio} は main.ts で1つだけ作られる）。{@link singOnce} が引く。 */
let currentAudio: GameAudio | null = null;

/**
 * 歌入りの短い MML を1回だけ流す（前の 筋の 解音ゼロの 代読歌が 使っていた。いまは 呼ぶ 所が 無い。
 * data/bgm/zerouta.mml を ?raw で import して渡す）。今の BGM を一時停止し、
 * 歌い終わる（か鳴らせないと分かる）と resolve して元の曲の続きへ戻す。
 * ミュート・BGM OFF・音のアンロック前は何もせずすぐ resolve する。
 */
export const singOnce = (mml: string): Promise<void> =>
	currentAudio ? currentAudio.singOnce(mml) : Promise.resolve();

/**
 * カメオ音源の追加読み込み（まちのどおりの 窓の 場面が 呼ぶ）。
 * 進み具合は {@link GameAudio.voiceProgress} に流す（せっていの「ボイス」欄に出る）。
 * ボイス OFF・音のアンロック前は何もせずすぐ resolve する。
 */
export const prepareCameoVoices = (): Promise<void> => {
	const audio = currentAudio;
	if (!audio) return Promise.resolve();
	return audio
		.prepareCameoVoices((loaded, total) => {
			audio.voiceProgress = { loaded, total };
			audio.onVoiceProgress?.();
		})
		.finally(() => {
			audio.voiceProgress = null;
			audio.onVoiceProgress?.();
		});
};

export class GameAudio {
	private ctx: AudioContext | null = null;
	private seGain: GainNode | null = null;
	private studioPromise: Promise<DtmStudio> | null = null;
	private bgmData: Record<string, string>;
	private sfxData: Record<string, string>;
	/** 鳴っている（はずの）曲名。 */
	private bgmName: string | null = null;
	private bgmPlayback: MmlPlayback | null = null;
	/** 再生を始めるたびに増える。古い再生の onStop などを見分ける。 */
	private bgmToken = 0;
	/** 最後に鳴らした位置（1小節=192ステップ）。止まったときの再開用。 */
	private bgmLastStep = 0;
	/** 今の曲を歌声つきで流すか（singBgm）。 */
	private sing = false;
	/** 歌声つきで鳴らしている再生（音量に SING_GAIN を掛ける）。 */
	private singing = new WeakSet<MmlPlayback>();
	private seCache = new Map<string, Promise<AudioBuffer | null>>();
	/** ループで鳴らしている効果音（seLoop。ミュートされたら止める）。 */
	private seLoops = new Set<AudioBufferSourceNode>();
	/** ループで鳴らしている MML の効果音（レコードの回転ノイズなど）。 */
	private mmlSeLoops = new Set<MmlPlayback>();
	/** 長い効果音が鳴り終わる時刻（AudioContext の時計。重ね鳴らし防止）。 */
	private seEnds = new Map<string, number>();
	/** 区切り待ちが終わる時刻（performance.now の時計）。 */
	private holdUntil = 0;
	/**
	 * 読み込み中の効果音と、鳴るか捨てるか決まる時刻（初めての音はまだ鳴っていないが、
	 * すぐ鳴って待ちが始まるので、その間も進めない）。
	 */
	private sePending = new Set<{ until: number }>();
	private voiceReady: Promise<void> | null = null;
	private cameoReady: Promise<void> | null = null;
	private speaking: {
		abort: AbortController;
		handle: SpeechHandle | null;
	} | null = null;
	/** 読み上げの準備の進み具合（設定画面の表示用）。 */
	voiceProgress: { loaded: number; total: number } | null = null;
	onVoiceProgress: (() => void) | null = null;

	constructor(bgm: Record<string, string>, sfx: Record<string, string>) {
		currentAudio = this; // main.ts で1つだけ作られる（モジュール関数 singOnce が使う）
		this.bgmData = bgm;
		this.sfxData = sfx;
		let prev = {
			bgm: settings.bgm,
			mute: settings.mute,
			bgmVolume: settings.bgmVolume,
			voice: settings.voice,
		};
		onSettingsChange(() => {
			const cur = {
				bgm: settings.bgm,
				mute: settings.mute,
				bgmVolume: settings.bgmVolume,
				voice: settings.voice,
			};
			if (cur.bgm !== prev.bgm || cur.mute !== prev.mute) {
				this.restartBgm(0);
			} else if (
				cur.bgmVolume !== prev.bgmVolume &&
				this.bgmPlayback &&
				this.bgmName
			) {
				const v = this.volumeFor(this.bgmData[this.bgmName] ?? "");
				this.bgmPlayback.setVolume(
					this.singing.has(this.bgmPlayback) ? Math.min(100, v * SING_GAIN) : v,
				);
			}
			if (cur.voice && !prev.voice) void this.prepareVoice();
			if (!cur.voice) this.stopSpeech();
			if (this.seGain) this.seGain.gain.value = seGainOf(settings.seVolume);
			// 音を消したら、鳴っていた音の区切りも待たず、ループの効果音も止める
			if (!this.seAudible()) {
				this.holdUntil = 0;
				this.sePending.clear();
				this.stopSeLoops();
			}
			prev = cur;
		});
		document.addEventListener("visibilitychange", () => this.onVisibility());
	}

	/** 最初のユーザー操作（のコールスタック内）で呼ぶ。以後は何度呼んでもよい。 */
	unlock(): void {
		if (!this.ctx) {
			// iOS: 既定のままだとマナーモードで Web Audio が無音になる。ctx を作る前に設定する。
			// （音を消したい人は右上のミュートボタンで消せる）
			const nav = navigator as Navigator & { audioSession?: { type: string } };
			try {
				if (nav.audioSession) nav.audioSession.type = "playback";
			} catch {
				// 対応していないブラウザ
			}
			const AC =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			this.ctx = new AC({ latencyHint: "interactive" });
			this.seGain = this.ctx.createGain();
			this.seGain.gain.value = seGainOf(settings.seVolume);
			this.seGain.connect(this.ctx.destination);
			// 鳴らすはずだった曲があれば始める
			if (this.bgmName) this.restartBgm(0);
			if (settings.voice) void this.prepareVoice();
		}
		const ctx = this.ctx;
		if (ctx.state === "suspended") void ctx.resume();
		// 古い iOS 向け：無音を1サンプル鳴らして出力を開く
		const src = ctx.createBufferSource();
		src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
		src.connect(ctx.destination);
		src.start();
	}

	get unlocked(): boolean {
		return this.ctx !== null;
	}

	/** 鳴っている（はずの）曲名。演出の後に元の曲へ戻す用。 */
	get currentBgm(): string | null {
		return this.bgmName;
	}

	private studio(): Promise<DtmStudio> {
		const ctx = this.ctx;
		if (!ctx) return Promise.reject(new Error("audio locked"));
		if (!this.studioPromise) {
			// voiceWorkerUrl は省略：Vite が dist/voice-worker.js を assets/ へ出力して URL を書き換える
			this.studioPromise = loadDtm().then((dtm) =>
				dtm.createDtmStudio({
					audioContext: ctx,
					masterVolume: STUDIO_MASTER_VOLUME,
					features: { midi: false, chord: false, presetUI: false, help: false },
				}),
			);
			this.studioPromise.catch(() => {
				this.studioPromise = null; // 次に要るときにやり直す
			});
		}
		return this.studioPromise;
	}

	private onVisibility(): void {
		const ctx = this.ctx;
		if (!ctx) return;
		if (document.visibilityState === "hidden") {
			void ctx.suspend();
			return;
		}
		void ctx.resume();
		// 隠れている間に停滞検知で止まっていたら、続きから鳴らす
		if (this.bgmName && this.canPlayBgm() && !this.bgmPlayback?.isPlaying()) {
			this.restartBgm(this.bgmLastStep);
		}
	}

	// ───────────────── BGM ─────────────────

	private volumeFor(mml: string): number {
		// 曲ごとの #volume に設定の音量を掛ける（既定 40 で #volume の 2 割、100 で半分）。
		// #volume は既定の 40 で -23 LUFS（sad・ending は -24）になるよう、測って直してある。
		return Math.min(100, songVolume(mml) * (settings.bgmVolume / 100) * 0.5);
	}

	/** 曲を切り替える。同じ曲なら続けて鳴らす。null で止める。 */
	bgm(name: string | null): void {
		if (
			name === this.bgmName &&
			(this.bgmPlayback?.isPlaying() || !this.canPlayBgm())
		)
			return;
		this.bgmName = name;
		this.sing = false;
		this.restartBgm(0);
	}

	/**
	 * 歌入りの曲（@@n 歌詞トラック）を歌声つきで流す（エンディング用）。
	 * ボイスが OFF・高音質でない・合成に失敗したときは、ふつうにインストで流す。
	 */
	singBgm(name: string): void {
		this.bgmName = name;
		this.sing = settings.voice && settings.bgm === "hq";
		this.restartBgm(0);
	}

	/**
	 * 歌入りの短い MML を1回だけ流す（終点・解音ゼロの代読歌。data/bgm/zerouta.mml）。
	 * 今の BGM を一時停止し、歌い終わったら同じ曲の続きから戻す。
	 * ボイス OFF・軽量モードのときは歌わずインストで流す（{@link singBgm} と同じ扱い）。
	 * ミュート・BGM OFF・アンロック前は何もせずすぐ戻る。
	 */
	async singOnce(mml: string): Promise<void> {
		const ctx = this.ctx;
		if (!ctx || !this.canPlayBgm()) return;
		// 今の曲を一時停止。bgmName を外しておくと、歌の間の設定変更（restartBgm）が
		// 元の曲を歌に重ねて鳴らし直すことはない（下で bgmPlayback に登録するので、
		// ミュート・曲質の切り替えは stopBgmPlayback 経由で歌ごと止まる）。
		const prevName = this.bgmName;
		const prevStep = this.bgmLastStep;
		this.stopBgmPlayback();
		this.bgmName = null;
		const token = this.bgmToken;
		const volume = this.volumeFor(mml);
		try {
			await new Promise<void>((resolve) => {
				let done = false;
				const finish = () => {
					if (done) return;
					done = true;
					resolve();
				};
				void (async () => {
					try {
						// 1回きりなので loop: false。鳴り終わる（か止められる）と onStop → finish
						const common = {
							loop: false,
							onStop: finish,
							pauseWhenHidden: false,
						};
						let pb: MmlPlayback | null = null;
						if (settings.bgm === "hq") {
							const studio = await this.studio();
							if (settings.voice) {
								try {
									pb = await studio.playSingingMML(mml, common);
									pb.setVolume(Math.min(100, volume * SING_GAIN));
								} catch (e) {
									console.warn(
										"[audio] 歌声つきで流せなかったのでインストにします",
										e,
									);
								}
							}
							if (!pb) {
								pb = studio.play(mml, common);
								pb.setVolume(volume);
							}
						} else {
							const dtm = await loadDtm();
							pb = dtm.playMML(mml, {
								...common,
								audioContext: ctx,
								destination: ctx.destination,
							});
							pb.setVolume(volume);
						}
						if (token !== this.bgmToken || done) {
							this.dispose(pb);
							finish();
							return;
						}
						this.bgmPlayback = pb;
					} catch (e) {
						console.warn("[audio] 歌を流せませんでした", e);
						finish();
					}
				})();
			});
		} finally {
			if (token === this.bgmToken) {
				// 何事もなく歌い終わった：元の曲の続きから戻す
				this.bgmName = prevName;
				this.restartBgm(prevStep);
			} else if (this.bgmName === null && !this.canPlayBgm()) {
				// 歌の途中でミュート等：曲名だけ戻す（解除の restartBgm がその曲を鳴らす）
				this.bgmName = prevName;
				this.bgmLastStep = prevStep;
			}
			// それ以外（歌の間に bgm() で曲が切り替わった）は、新しい曲を尊重して何もしない
		}
	}

	private canPlayBgm(): boolean {
		return !!this.ctx && !settings.mute && settings.bgm !== "off";
	}

	private dispose(pb: MmlPlayback): void {
		try {
			pb.stop();
			pb.destroy(); // 渡した ctx は閉じない
		} catch {
			// 止め損ねても続行
		}
	}

	private stopBgmPlayback(): void {
		this.bgmToken++;
		const pb = this.bgmPlayback;
		this.bgmPlayback = null;
		if (pb) this.dispose(pb);
	}

	private restartBgm(fromStep: number): void {
		this.stopBgmPlayback();
		const token = this.bgmToken;
		const name = this.bgmName;
		this.bgmLastStep = fromStep;
		if (!name || !this.canPlayBgm()) return;
		const mml = this.bgmData[name];
		if (!mml) {
			console.warn(`[audio] BGM ${name} がありません`);
			return;
		}
		void this.startMml(mml, true, fromStep || undefined, token).then((pb) => {
			if (!pb) return;
			if (token !== this.bgmToken) {
				this.dispose(pb);
				return;
			}
			this.bgmPlayback = pb;
		});
	}

	private async startMml(
		mml: string,
		loop: boolean,
		startStep: number | undefined,
		token: number,
	): Promise<MmlPlayback | null> {
		const ctx = this.ctx;
		if (!ctx) return null;
		const loopOpt = loop
			? hasIntro(mml)
				? { start: { bar: 5 } }
				: true
			: false;
		const volume = this.volumeFor(mml);
		const onTick = (step: number) => {
			if (token === this.bgmToken) this.bgmLastStep = step;
		};
		// 自分で止めていないのに止まった = 停滞検知。見えていれば続きから鳴らし直す
		const onStop = () => {
			if (!loop || token !== this.bgmToken || !this.bgmName) return;
			if (document.visibilityState === "visible")
				this.restartBgm(this.bgmLastStep);
		};
		const common = {
			loop: loopOpt,
			startStep,
			onTick,
			onStop,
			pauseWhenHidden: false,
		};
		try {
			if (settings.bgm === "hq") {
				const studio = await this.studio();
				if (this.sing) {
					try {
						const pb = await studio.playSingingMML(mml, common);
						pb.setVolume(Math.min(100, volume * SING_GAIN));
						this.singing.add(pb);
						return pb;
					} catch (e) {
						console.warn(
							"[audio] 歌声つきで流せなかったのでインストにします",
							e,
						);
					}
				}
				const pb = studio.play(mml, common);
				pb.setVolume(volume);
				return pb;
			}
			const dtm = await loadDtm();
			const pb = dtm.playMML(mml, {
				...common,
				audioContext: ctx,
				destination: ctx.destination,
			});
			pb.setVolume(volume);
			return pb;
		} catch (e) {
			console.warn("[audio] BGM を鳴らせませんでした", e);
			return null;
		}
	}

	// ───────────────── 効果音 ─────────────────

	private buffer(name: string): Promise<AudioBuffer | null> | null {
		const ctx = this.ctx;
		const ref = this.sfxData[name];
		if (!ctx || !ref) return null;
		let p = this.seCache.get(name);
		if (!p) {
			const url = ref.startsWith("rpgen:") ? soundUrl(ref.slice(6)) : ref;
			p = fetch(url)
				.then((r) =>
					r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)),
				)
				.then((b) => ctx.decodeAudioData(b))
				.catch((e) => {
					console.warn(`[audio] 効果音 ${name} を読めませんでした`, e);
					return null;
				});
			this.seCache.set(name, p);
		}
		return p;
	}

	/** 効果音をあらかじめ読み込む（最初の1回の遅れを無くす）。 */
	preloadSe(names: string[]): void {
		for (const n of names) {
			const ref = this.sfxData[n];
			// MML の効果音はファイルが無い。かわりに dtm を先に読んでおく
			if (ref && isMmlSe(ref)) void loadDtm();
			else void this.buffer(n);
		}
	}

	/** 効果音が聞こえる設定か（ミュート・音量 0 のときは鳴らさず、区切りも待たない）。 */
	private seAudible(): boolean {
		return !settings.mute && settings.seVolume > 0;
	}

	/**
	 * 効果音を1回鳴らす。opt.pan は左右の寄り（-1 左〜1 右。StereoPannerNode。
	 * 「ぽ……ぽ……」の距離感に使う）、opt.volume は倍率（0〜1 で小さく）。
	 */
	se(name: string, opt?: { pan?: number; volume?: number }): void {
		if (!this.seAudible() || !this.ctx || !this.seGain) return;
		const ctx = this.ctx;
		const gain = this.seGain;
		const ref = this.sfxData[name];
		if (ref && isMmlSe(ref)) {
			this.playMmlSe(ref, opt, false);
			return;
		}
		const p = this.buffer(name);
		if (!p) return;
		const t0 = performance.now();
		const pending = { until: t0 + SE_LATE_MS };
		this.sePending.add(pending);
		void p.then((buf) => {
			this.sePending.delete(pending);
			// 読み込みに時間がかかりすぎたら鳴らさない（ずれた音は邪魔）
			if (!buf || performance.now() - t0 > SE_LATE_MS) return;
			if (!this.seAudible()) return; // 読み込み中に消された
			// ジングルのような長い音は、同じ音が鳴り終わるまで重ねない（カーソル音などの短い音は重ねてよい）
			if (buf.duration > LONG_SE_SEC) {
				if ((this.seEnds.get(name) ?? 0) > ctx.currentTime) return;
				this.seEnds.set(name, ctx.currentTime + buf.duration);
			}
			const src = ctx.createBufferSource();
			src.buffer = buf;
			// 素材ごとの大きさの補正（と1音だけの倍率）→（パン）→ 全体の音量
			const level = ctx.createGain();
			level.gain.value = seLevel(name) * (opt?.volume ?? 1);
			let tail: AudioNode = level;
			if (opt?.pan && typeof ctx.createStereoPanner === "function") {
				const panner = ctx.createStereoPanner();
				panner.pan.value = Math.max(-1, Math.min(1, opt.pan));
				tail = level.connect(panner);
			}
			src.connect(level);
			tail.connect(gain);
			src.onended = () => {
				level.disconnect();
				tail.disconnect();
			};
			src.start();
			// 実際に鳴り始めた音だけ、本体が鳴り終わるまで次へ進めない
			this.hold(seWaitMs(name));
		});
	}

	/**
	 * 効果音をループで鳴らす（レコードの回転ノイズなど）。返した関数で止める。
	 * 鳴っている間にミュート・音量 0 にされたら止める（解除しても自動では戻らない）。
	 * 区切り待ち（seHeld）には掛けない（鳴りっぱなしの音で文送りを止めない）。
	 */
	seLoop(name: string): () => void {
		if (!this.seAudible() || !this.ctx || !this.seGain) return () => {};
		const ctx = this.ctx;
		const gain = this.seGain;
		const ref = this.sfxData[name];
		if (ref && isMmlSe(ref)) return this.playMmlSe(ref, undefined, true);
		const p = this.buffer(name);
		if (!p) return () => {};
		let src: AudioBufferSourceNode | null = null;
		let stopped = false;
		void p.then((buf) => {
			if (!buf || stopped || !this.seAudible()) return;
			src = ctx.createBufferSource();
			src.buffer = buf;
			src.loop = true;
			const level = ctx.createGain();
			level.gain.value = seLevel(name);
			src.connect(level).connect(gain);
			src.onended = () => level.disconnect();
			src.start();
			this.seLoops.add(src);
		});
		return () => {
			stopped = true;
			if (src) {
				this.seLoops.delete(src);
				try {
					src.stop();
				} catch {
					// 止め損ねても続行
				}
			}
		};
	}

	/** ループの効果音を全部止める（ミュートされたとき）。 */
	private stopSeLoops(): void {
		for (const src of this.seLoops) {
			try {
				src.stop();
			} catch {
				// 止め損ねても続行
			}
		}
		this.seLoops.clear();
		for (const pb of this.mmlSeLoops) this.dispose(pb);
		this.mmlSeLoops.clear();
	}

	/**
	 * MML の効果音（data/sfx.ts の値が MML のもの。レコードノイズ・秒針・太鼓など）。
	 * dtm の playMML（内蔵シンセ）で鳴らし、効果音の音量ノード（seGain）へつなぐ。
	 * 大きさは BGM と同じく MML の #volume= で1音ずつ決める（雰囲気のゲームなので
	 * どれも小さく書いてある。data/sfx.ts）。SE_LOUDNESS の補正・区切り待ちは掛けない。
	 * loop = true でループ（返した関数で止める。ミュートされたら stopSeLoops が止める）。
	 */
	private playMmlSe(
		mml: string,
		opt?: { pan?: number; volume?: number },
		loop = false,
	): () => void {
		const ctx = this.ctx;
		const gain = this.seGain;
		if (!ctx || !gain) return () => {};
		// （パン）→ 全体の音量。rpgen の効果音と同じ並び
		let dest: AudioNode = gain;
		let panner: StereoPannerNode | null = null;
		if (opt?.pan && typeof ctx.createStereoPanner === "function") {
			panner = ctx.createStereoPanner();
			panner.pan.value = Math.max(-1, Math.min(1, opt.pan));
			panner.connect(gain);
			dest = panner;
		}
		const t0 = performance.now();
		let pb: MmlPlayback | null = null;
		let stopped = false;
		const cleanup = () => panner?.disconnect();
		void loadDtm().then((dtm) => {
			if (stopped || !this.seAudible()) return cleanup();
			// dtm の読み込みに時間がかかりすぎたら鳴らさない（ずれた音は邪魔。ループは鳴らす）
			if (!loop && performance.now() - t0 > SE_LATE_MS) return cleanup();
			let ended = false;
			const playback = dtm.playMML(mml, {
				loop,
				audioContext: ctx,
				destination: dest,
				pauseWhenHidden: false,
				// 1回きりの音は、鳴り終わったら片づける（injected ctx なので destroy は
				// リスナ解除だけ。stop() 経由の再入は ended で止める）
				onStop: () => {
					if (loop || ended) return;
					ended = true;
					queueMicrotask(() => {
						try {
							playback.destroy();
						} catch {
							// 片づけ損ねても続行
						}
						cleanup();
					});
				},
			});
			pb = playback;
			pb.setVolume(Math.min(100, songVolume(mml) * 0.5 * (opt?.volume ?? 1)));
			if (loop) this.mmlSeLoops.add(pb);
		});
		return () => {
			stopped = true;
			if (pb) {
				this.mmlSeLoops.delete(pb);
				this.dispose(pb);
				cleanup();
			}
		};
	}

	/** 今から ms の間を区切り待ちにする（前の待ちが長ければそちら）。 */
	private hold(ms: number): void {
		if (ms <= 0) return;
		this.holdUntil = Math.max(
			this.holdUntil,
			performance.now() + Math.min(ms, SE_HOLD_MAX_MS),
		);
	}

	/** 効果音の区切り待ちの最中か（鳴らしたばかりの音の本体がまだ鳴っている・読み込み中）。 */
	get seHeld(): boolean {
		const now = performance.now();
		if (now < this.holdUntil) return true;
		for (const p of this.sePending) {
			if (p.until > now) return true;
			this.sePending.delete(p); // 読み込みが止まったままの音は待たない
		}
		return false;
	}

	/**
	 * 効果音の区切りまで待つ。待ちの間に次の音が鳴れば延びるが、呼んでから
	 * SE_HOLD_MAX_MS を超えては待たない（時計で決めるので、タブが隠れていても抜ける）。
	 */
	async seSettled(): Promise<void> {
		const limit = performance.now() + SE_HOLD_MAX_MS;
		// 読み込み済みの音は次のマイクロタスクで鳴り始めて待ちが決まるので、先にそれを済ませる
		await Promise.resolve();
		while (this.seHeld) {
			const rest = limit - performance.now();
			if (rest <= 0) return;
			await new Promise((r) => setTimeout(r, Math.min(rest, 30)));
		}
	}

	/** 効果音の鳴り始めと鳴り終わり（ms。頭の無音を含むファイルの中の位置）。測っていなければ null。 */
	seSpan(name: string): { startMs: number; endMs: number } | null {
		const m = SE_LOUDNESS[name];
		return m ? { startMs: m[5], endMs: m[6] } : null;
	}

	// ───────────────── 読み上げ ─────────────────

	/** 読み上げの準備（TTS データ。2回目以降はブラウザのキャッシュ）。 */
	prepareVoice(): Promise<void> {
		if (!this.ctx) return Promise.resolve();
		this.voiceReady ??= (async () => {
			try {
				const studio = await this.studio();
				// コア8音源（DESIGN §5。カメオ音源は改札が開いてから prepareCameoVoices で）
				await studio.prepareSpeech(CORE_VOICE_MODELS, {
					onProgress: (loaded: number, total: number) => {
						this.voiceProgress = { loaded: Math.min(loaded, total), total };
						this.onVoiceProgress?.();
					},
				});
				this.voiceProgress = null;
			} catch (e) {
				console.warn("[audio] 読み上げの準備に失敗しました", e);
				this.voiceReady = null;
			}
		})();
		return this.voiceReady;
	}

	/**
	 * カメオ音源の準備（朝のスレの声）。
	 * コアと同時に落とすと重いので、まちのどおりの 窓の 場面（転）が 呼ぶ。
	 * 失敗しても進行は止めない：準備できていない声は speak が null を返し、文字だけで進む。
	 */
	prepareCameoVoices(
		onProgress?: (loaded: number, total: number) => void,
	): Promise<void> {
		if (!this.ctx || !settings.voice) return Promise.resolve();
		this.cameoReady ??= (async () => {
			try {
				const studio = await this.studio();
				await studio.prepareSpeech(CAMEO_VOICE_MODELS, {
					onProgress: (loaded: number, total: number) =>
						onProgress?.(Math.min(loaded, total), total),
				});
			} catch (e) {
				console.warn("[audio] カメオ音源の準備に失敗しました", e);
				this.cameoReady = null;
			}
		})();
		return this.cameoReady;
	}

	/** AudioContext の時刻 t（秒）に鳴らした音が聞こえる時刻（performance.now の時計、ms）。 */
	private audibleAt(t: number): number {
		const ctx = this.ctx;
		if (!ctx) return performance.now();
		// outputLatency は Safari に無い（Bluetooth のイヤホンなどで大きくなる）
		const latency = Number.isFinite(ctx.outputLatency) ? ctx.outputLatency : 0;
		return performance.now() + (t - ctx.currentTime + latency) * 1000;
	}

	/**
	 * セリフを読み上げる。stop を呼ぶと止まる（準備中なら準備ごと中断）。
	 * 合成が終わる前に次のセリフへ進んだときは、遅れて届いた声を捨てる。
	 * started で鳴り始める時刻が分かる（文字送りを声の頭に合わせる用）。
	 * leadMs を渡すと、今からそのぶんより前には鳴らさない（「……」で始まる文の間）。
	 */
	speak(text: string, voice: VoiceDef, leadMs = 0): Speaking {
		this.stopSpeech();
		const body = speechText(text);
		const ctx = this.ctx;
		if (!settings.voice || !ctx || !body) return { stop: () => {} };
		const at = leadMs > 0 ? ctx.currentTime + leadMs / 1000 : undefined;
		const entry = {
			abort: new AbortController(),
			handle: null as SpeechHandle | null,
		};
		this.speaking = entry;
		const started = (async (): Promise<SpeechStart | null> => {
			try {
				await this.prepareVoice();
				const studio = await this.studio();
				if (entry.abort.signal.aborted) return null;
				const handle = await studio.speak(body, {
					model: voice.model,
					pitchOffset: voice.pitchOffset ?? 0,
					emotion: voice.emotion ?? "neutral",
					style: voice.style ?? "neutral",
					// 既定（80）で声ごとの倍率＝目標の大きさ（data/loudness.ts）
					volume:
						voiceGain(voice.model) * (settings.voiceVolume / REF_VOLUME.voice),
					// 最初のかたまり（＋貯め）が出来たら頭から鳴らす。後続の合成が遅れたら
					// 飛ばさずに後ろをずらす（lateChunks の既定 "shift"）
					awaitRender: "first-chunk",
					at,
					minBufferSec:
						SPEECH_BUFFER_SEC[voice.model] ?? SPEECH_BUFFER_DEFAULT_SEC,
					signal: entry.abort.signal,
				});
				if (this.speaking !== entry || entry.abort.signal.aborted) {
					handle?.stop();
					return null;
				}
				if (!handle) return null;
				entry.handle = handle;
				return {
					startTime: handle.startTime,
					at: this.audibleAt(handle.startTime),
					durationSec: handle.durationSec,
					// 鳴り終わりの見込み。ずれが分かっていればその分（shiftSec）、次のかたまりを
					// 待って止まっていれば今から残りの長さ（position() は止まっている間進まない）。
					// 遅い方を取る
					endAt: () =>
						this.audibleAt(
							Math.max(
								handle.startTime + handle.shiftSec + handle.durationSec,
								ctx.currentTime +
									Math.max(0, handle.durationSec - handle.position()),
							),
						),
				};
			} catch (e) {
				if (!entry.abort.signal.aborted)
					console.warn("[audio] 読み上げに失敗しました", e);
				return null;
			}
		})();
		return {
			stop: () => {
				if (this.speaking === entry) this.stopSpeech();
			},
			started,
		};
	}

	stopSpeech(): void {
		const s = this.speaking;
		this.speaking = null;
		if (!s) return;
		s.abort.abort();
		s.handle?.stop();
	}
}
