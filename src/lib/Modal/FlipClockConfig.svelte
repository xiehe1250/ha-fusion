<script lang="ts">
	import { dashboard, record, lang, ripple } from '$lib/Stores';
	import { onDestroy } from 'svelte';
	import FlipClock from '$lib/Main/FlipClock.svelte';
	import ConfigButtons from '$lib/Modal/ConfigButtons.svelte';
	import Modal from '$lib/Modal/Index.svelte';
	import { updateObj } from '$lib/Utils';
	import Ripple from 'svelte-ripple';

	export let isOpen: boolean;
	export let sel: any;

	let modalTransitionEnd = false;

	function handleEvent() {
		modalTransitionEnd = true;
	}

	function set(key: string, value?: any) {
		sel = updateObj(sel, key, value);
		$dashboard = $dashboard;
	}

	onDestroy(() => $record());
</script>

{#if isOpen}
	<Modal on:transitionend={handleEvent}>
		<h1 slot="title">{$lang('flip_clock') || 'Flip Clock'}</h1>

		<h2>{$lang('preview')}</h2>

		<div class="preview">
			<FlipClock {sel} />
		</div>

		<h2>{$lang('options') || 'Options'}</h2>

		<div class="option-group">
			<span class="option-label">{$lang('format') || 'Format'}</span>
			<div class="button-row">
				<button
					class:selected={sel?.hour12 !== true}
					on:click={() => set('hour12', false)}
					use:Ripple={$ripple}
				>
					24h
				</button>
				<button
					class:selected={sel?.hour12 === true}
					on:click={() => set('hour12', true)}
					use:Ripple={$ripple}
				>
					12h
				</button>
			</div>
		</div>

		<div class="option-group">
			<span class="option-label">{$lang('seconds') || 'Seconds'}</span>
			<div class="button-row">
				<button
					class:selected={sel?.show_seconds !== false}
					on:click={() => set('show_seconds', true)}
					use:Ripple={$ripple}
				>
					{$lang('visible') || 'Show'}
				</button>
				<button
					class:selected={sel?.show_seconds === false}
					on:click={() => set('show_seconds', false)}
					use:Ripple={$ripple}
				>
					{$lang('hidden') || 'Hide'}
				</button>
			</div>
		</div>

		<h2>{$lang('mobile')}</h2>

		<div class="button-row">
			<button
				class:selected={sel?.hide_mobile !== true}
				on:click={() => set('hide_mobile')}
				use:Ripple={$ripple}
			>
				{$lang('visible')}
			</button>
			<button
				class:selected={sel?.hide_mobile === true}
				on:click={() => set('hide_mobile', true)}
				use:Ripple={$ripple}
			>
				{$lang('hidden')}
			</button>
		</div>

		<ConfigButtons {sel} />
	</Modal>
{/if}

<style>
	.preview {
		pointer-events: unset !important;
		background-color: rgb(0, 0, 0, 0.15);
		border-radius: 0.6rem;
		padding: 0.5rem;
		overflow: hidden;
	}

	.option-group {
		margin-bottom: 1rem;
	}

	.option-label {
		display: block;
		font-size: 0.85rem;
		opacity: 0.7;
		margin-bottom: 0.4rem;
	}

	.button-row {
		display: flex;
		gap: 0.5rem;
	}
</style>
