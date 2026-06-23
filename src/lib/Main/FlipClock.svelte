<script lang="ts">
	import { timer, selectedLanguage, editMode } from '$lib/Stores';
	import { openModal } from 'svelte-modals';

	export let sel: any;
	export let demo = false;

	let hours: string[] = ['0', '0'];
	let minutes: string[] = ['0', '0'];
	let seconds: string[] = ['0', '0'];
	let prevHours: string[] = ['0', '0'];
	let prevMinutes: string[] = ['0', '0'];
	let prevSeconds: string[] = ['0', '0'];

	let flipKeyH = [0, 0];
	let flipKeyM = [0, 0];
	let flipKeyS = [0, 0];
	let flipCounter = 0;

	$: showSeconds = sel?.show_seconds !== false;
	$: hour12 = sel?.hour12 === true;

	function pad(n: number): string[] {
		return String(n).padStart(2, '0').split('');
	}

	$: {
		const now = $timer;
		let h = now.getHours();
		const m = now.getMinutes();
		const s = now.getSeconds();
		if (hour12 && h > 12) h -= 12;
		if (hour12 && h === 0) h = 12;
		const newH = pad(h),
			newM = pad(m),
			newS = pad(s);
		for (let i = 0; i < 2; i++) {
			if (newH[i] !== hours[i]) {
				flipCounter++;
				flipKeyH[i] = flipCounter;
			}
			if (newM[i] !== minutes[i]) {
				flipCounter++;
				flipKeyM[i] = flipCounter;
			}
			if (newS[i] !== seconds[i]) {
				flipCounter++;
				flipKeyS[i] = flipCounter;
			}
		}
		prevHours = hours;
		prevMinutes = minutes;
		prevSeconds = seconds;
		hours = newH;
		minutes = newM;
		seconds = newS;
	}

	function handleClick() {
		if ($editMode) openModal(() => import('$lib/Modal/FlipClockConfig.svelte'), { sel });
	}
</script>

{#if demo}
	<div class="fc">
		<div class="dg">
			<div class="fd">
				<div class="h ht"><span>2</span></div>
				<div class="h hb"><span>2</span></div>
			</div>
			<div class="fd">
				<div class="h ht"><span>3</span></div>
				<div class="h hb"><span>3</span></div>
			</div>
		</div>
		<div class="sep">:</div>
		<div class="dg">
			<div class="fd">
				<div class="h ht"><span>5</span></div>
				<div class="h hb"><span>5</span></div>
			</div>
			<div class="fd">
				<div class="h ht"><span>9</span></div>
				<div class="h hb"><span>9</span></div>
			</div>
		</div>
	</div>
{:else}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fc" class:edit={$editMode} class:sec={showSeconds} on:click={handleClick} on:keydown>
		<div class="dg">
			{#each [0, 1] as i (flipKeyH[i])}
				<div class="fd">
					<div class="h ht"><span>{hours[i]}</span></div>
					<div class="h hb"><span>{hours[i]}</span></div>
					<div class="fl ft"><span>{prevHours[i]}</span></div>
					<div class="fl fb"><span>{hours[i]}</span></div>
				</div>
			{/each}
		</div>
		<div class="sep">:</div>
		<div class="dg">
			{#each [0, 1] as i (flipKeyM[i])}
				<div class="fd">
					<div class="h ht"><span>{minutes[i]}</span></div>
					<div class="h hb"><span>{minutes[i]}</span></div>
					<div class="fl ft"><span>{prevMinutes[i]}</span></div>
					<div class="fl fb"><span>{minutes[i]}</span></div>
				</div>
			{/each}
		</div>
		{#if showSeconds}
			<div class="sep">:</div>
			<div class="dg">
				{#each [0, 1] as i (flipKeyS[i])}
					<div class="fd">
						<div class="h ht"><span>{seconds[i]}</span></div>
						<div class="h hb"><span>{seconds[i]}</span></div>
						<div class="fl ft"><span>{prevSeconds[i]}</span></div>
						<div class="fl fb"><span>{seconds[i]}</span></div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* ====== Container ====== */
	.fc {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		padding: 4px 8px;
		height: 100%;
		font-family: 'Oswald', 'Roboto Condensed', system-ui, sans-serif;
		font-weight: 500;
		font-size: 22px;
	}
	.fc.sec {
		font-size: 15px;
		gap: 8px;
	}
	.fc.edit {
		cursor: pointer;
	}

	/* ====== Digit Group ====== */
	.dg {
		display: flex;
		gap: 5px;
	}

	/* ====== Single Digit (60×80) ====== */
	.fd {
		position: relative;
		width: 60px;
		height: 80px;
		perspective: 300px;
	}

	/* ====== Half container (clips text) ====== */
	.h {
		position: absolute;
		left: 0;
		width: 100%;
		height: 50%;
		overflow: hidden;
	}

	/* ====== Text: height 50% (half of half = quarter of digit), centered + shifted ====== */
	.h span,
	.fl span {
		display: flex;
		position: absolute;
		left: 0;
		width: 100%;
		height: 50%;
		align-items: center;
		justify-content: center;
		font-size: 1.8em;
		font-weight: inherit;
		color: #fff;
		user-select: none;
	}

	/* Top half: clip shows upper arc of digit */
	.ht {
		top: 0;
		background: rgb(30, 30, 36);
		border-radius: 6px 6px 0 0;
		border-bottom: 1.5px solid rgba(0, 0, 0, 0.6);
	}
	.ht span {
		top: 0;
		/* flex center puts text at 37.5% of half; translateY(50%) moves it to 25% = center of top half */
		transform: translateY(50%);
	}

	/* Bottom half: clip shows lower arc of digit */
	.hb {
		bottom: 0;
		background: rgb(40, 40, 46);
		border-radius: 0 0 6px 6px;
	}
	.hb span {
		bottom: 0;
		/* flex center puts text at 62.5% of half; translateY(-50%) moves it to 75% = center of bottom half */
		transform: translateY(-50%);
	}

	/* ====== Flip flaps (animated) ====== */
	.fl {
		position: absolute;
		left: 0;
		width: 100%;
		height: 50%;
		overflow: hidden;
		backface-visibility: hidden;
	}

	.ft {
		top: 0;
		z-index: 3;
		background: rgb(30, 30, 36);
		border-radius: 6px 6px 0 0;
		border-bottom: 1.5px solid rgba(0, 0, 0, 0.6);
		transform-origin: center bottom;
		box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
		animation: foldDown 0.3s ease-in forwards;
	}
	.ft span {
		top: 0;
		transform: translateY(50%);
	}

	.fb {
		bottom: 0;
		z-index: 2;
		background: rgb(40, 40, 46);
		border-radius: 0 0 6px 6px;
		transform-origin: center top;
		transform: rotateX(90deg);
		box-shadow: 0 -3px 6px rgba(0, 0, 0, 0.15);
		animation: unfoldUp 0.3s ease-out 0.12s forwards;
	}
	.fb span {
		bottom: 0;
		transform: translateY(-50%);
	}

	@keyframes foldDown {
		from {
			transform: rotateX(0deg);
		}
		to {
			transform: rotateX(-90deg);
		}
	}
	@keyframes unfoldUp {
		from {
			transform: rotateX(90deg);
		}
		to {
			transform: rotateX(0deg);
		}
	}

	/* ====== Colon ====== */
	.sep {
		font-size: 1.6em;
		color: rgba(255, 255, 255, 0.4);
		line-height: 1;
		animation: blink 2s ease-in-out infinite;
	}
	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.25;
		}
	}
</style>
