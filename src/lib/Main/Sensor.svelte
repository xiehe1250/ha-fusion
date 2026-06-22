<script lang="ts">
	import { states, editMode, motion, selectedLanguage, lang } from '$lib/Stores';
	import type { HassEntity } from 'home-assistant-js-websocket';
	import { isTimestamp, relativeTime } from '$lib/Utils';
	import { openModal } from 'svelte-modals';

	export let sel: any;

	$: entity_id = sel?.entity_id as string | undefined;
	$: prefix = sel?.prefix as string | undefined;
	$: suffix = sel?.suffix as string | undefined;
	$: date = sel?.date as boolean | undefined;

	let entity: HassEntity;

	$: if (entity_id && $states?.[entity_id]?.last_updated !== entity?.last_updated) {
		entity = $states?.[entity_id];
	}

	$: state = entity?.state;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="container"
	class:visible={!entity || state || $editMode}
	style:padding-top={!entity || state || $editMode ? '' : '0'}
	style:padding-bottom={!entity || state || $editMode ? '' : '0'}
	style:transition="grid-template-rows {$motion}ms ease, padding {$motion}ms ease"
	style:cursor={$editMode ? 'pointer' : 'default'}
	on:click={() => $editMode && openModal(() => import('$lib/Modal/SensorConfig.svelte'), { sel })}
>
	<div class="expandable">
		{#if ['unavailable', 'unknown'].includes(state)}
			{prefix || ''}{$lang(state)}{suffix || ''}

			<!-- relative time -->
		{:else if state && date}
			{#if isTimestamp(state)}
				{prefix || ''}{relativeTime(state, $selectedLanguage)}{suffix || ''}
			{:else}
				{prefix || ''}{$lang('invalid_timestamp')}{suffix || ''}
			{/if}

			<!-- state -->
		{:else if state}
			{prefix || ''}{@html state}{suffix || ''}

			<!-- hide -->
		{:else if entity && !state}
			<span>{entity_id}</span>

			<!-- !entity_id -->
		{:else if !entity_id && !state}
			<span>{$lang('sensor')}</span>
		{:else}
			{$lang('unknown')}
		{/if}
	</div>
</div>

<style>
	.container {
		display: grid;
		grid-template-rows: 0fr;
		overflow: hidden;
		pointer-events: none;
		height: 100%;
		box-sizing: border-box;
		padding: 0.75rem 1rem;

		/* need to specify to properly show emoji */
		font-family: 'Inter Variable';
		text-shadow: 0px 0px 5px rgba(0, 0, 0, 0.1);
	}

	.visible {
		grid-template-rows: 1fr;
		pointer-events: auto;
	}

	.expandable {
		min-height: 0;
		white-space: pre-line;
	}

	span {
		color: rgba(255, 255, 255, 0.25);
	}
</style>
