<script lang="ts">
	import { dashboard, record, lang, ripple, entityList } from '$lib/Stores';
	import { onDestroy } from 'svelte';
	import Modal from '$lib/Modal/Index.svelte';
	import Select from '$lib/Components/Select.svelte';
	import ConfigButtons from '$lib/Modal/ConfigButtons.svelte';
	import { updateObj } from '$lib/Utils';
	import type { MapCardItem } from '$lib/Types';
	import Icon from '@iconify/svelte';
	import Ripple from 'svelte-ripple';

	export let isOpen: boolean;
	export let sel: MapCardItem;

	/** All device_tracker + person entities as Select options */
	$: trackerOptions = $entityList('device_tracker').concat($entityList('person'));

	/** Currently selected entity_ids */
	$: selectedIds = sel?.entity_ids ?? [];

	function set(key: string, value?: any) {
		sel = updateObj(sel, key, value) as MapCardItem;
		$dashboard = $dashboard;
	}

	function addEntity(entity_id: string) {
		if (!entity_id || selectedIds.includes(entity_id)) return;
		set('entity_ids', [...selectedIds, entity_id]);
	}

	function removeEntity(entity_id: string) {
		set(
			'entity_ids',
			selectedIds.filter((id) => id !== entity_id)
		);
	}

	onDestroy(() => $record());
</script>

{#if isOpen}
	<Modal>
		<h1 slot="title">{$lang('map')}</h1>

		<!-- Device list -->
		<h2>{$lang('entity')}</h2>

		{#if trackerOptions}
			<Select
				options={trackerOptions.filter((o) => !selectedIds.includes(o.id))}
				placeholder={$lang('add') + ' device_tracker / person'}
				value={undefined}
				on:change={(event) => addEntity(event.detail)}
			/>
		{/if}

		<!-- Selected devices -->
		{#if selectedIds.length > 0}
			<div class="selected-list">
				{#each selectedIds as entity_id (entity_id)}
					<div class="selected-item">
						<Icon icon="mdi:map-marker" height="1rem" />
						<span class="entity-label">{entity_id}</span>
						<button
							class="remove-btn"
							on:click={() => removeEntity(entity_id)}
							use:Ripple={$ripple}
							aria-label="Remove"
						>
							<Icon icon="mdi:close" height="1rem" />
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<p class="hint">{$lang('map_auto_track')}</p>
		{/if}

		<!-- Zoom -->
		<h2>{$lang('zoom')}</h2>

		<div class="row">
			{#each [10, 12, 14, 16] as z}
				<button
					class="preset-btn"
					class:selected={sel?.zoom === z || (!sel?.zoom && z === 14)}
					on:click={() => set('zoom', z)}
					use:Ripple={$ripple}
				>
					{z}
				</button>
			{/each}
		</div>

		<ConfigButtons {sel} />
	</Modal>
{/if}

<style>
	.selected-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}

	.selected-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.07);
		border-radius: 0.5rem;
		padding: 0.45rem 0.6rem;
		font-size: 0.88rem;
		color: rgba(255, 255, 255, 0.85);
	}

	.entity-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remove-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 0.2rem;
		border-radius: 50%;
		transition: color 150ms ease;
	}

	.remove-btn:hover {
		color: #ff6b6b;
	}

	.hint {
		color: rgba(255, 255, 255, 0.35);
		font-size: 0.88rem;
		margin: 0.4rem 0 0;
	}

	.row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.preset-btn {
		padding: 0.4rem 0.9rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.88rem;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.preset-btn.selected {
		background: rgba(75, 166, 237, 0.3);
		border-color: rgba(75, 166, 237, 0.6);
		color: white;
	}
</style>
