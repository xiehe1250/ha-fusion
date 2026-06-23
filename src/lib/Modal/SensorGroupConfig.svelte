<script lang="ts">
	import { dashboard, record, lang, ripple, entityList, states } from '$lib/Stores';
	import { onDestroy } from 'svelte';
	import Modal from '$lib/Modal/Index.svelte';
	import Select from '$lib/Components/Select.svelte';
	import ConfigButtons from '$lib/Modal/ConfigButtons.svelte';
	import { updateObj } from '$lib/Utils';
	import type { SensorGroupItem, SensorGroup } from '$lib/Types';
	import Icon from '@iconify/svelte';
	import Ripple from 'svelte-ripple';

	export let isOpen: boolean;
	export let sel: SensorGroupItem;

	let newGroupName = '';

	$: groups = sel?.groups ?? [];

	/** All sensor + climate entities as Select options */
	$: selectOptions = [...$entityList('sensor'), ...$entityList('climate')].sort((a, b) =>
		a.label.localeCompare(b.label)
	);

	function set(key: string, value?: any) {
		sel = updateObj(sel, key, value) as SensorGroupItem;
		$dashboard = $dashboard;
	}

	function addGroup() {
		const name = newGroupName.trim() || `Group ${groups.length + 1}`;
		const newGroup: SensorGroup = { name, icon: 'mdi:gauge', entity_ids: [] };
		set('groups', [...groups, newGroup]);
		newGroupName = '';
	}

	function removeGroup(index: number) {
		set(
			'groups',
			groups.filter((_, i) => i !== index)
		);
	}

	function updateGroup(index: number, key: string, value: any) {
		const updated = [...groups];
		updated[index] = { ...updated[index], [key]: value };
		set('groups', updated);
	}

	function addSensor(groupIndex: number, entity_id: string) {
		if (!entity_id) return;
		const group = groups[groupIndex];
		if (group.entity_ids.includes(entity_id)) return;
		updateGroup(groupIndex, 'entity_ids', [...group.entity_ids, entity_id]);
	}

	function removeSensor(groupIndex: number, entity_id: string) {
		const group = groups[groupIndex];
		updateGroup(
			groupIndex,
			'entity_ids',
			group.entity_ids.filter((id) => id !== entity_id)
		);
	}

	function getAvailableSensors(groupIndex: number) {
		const usedIds = new Set(groups[groupIndex]?.entity_ids ?? []);
		return selectOptions.filter((o) => !usedIds.has(o.id));
	}

	onDestroy(() => $record());
</script>

{#if isOpen}
	<Modal size="large">
		<h1 slot="title">{$lang('sensor_group') || 'Sensor Group'}</h1>

		<!-- Add new group -->
		<h2>{$lang('group') || 'Groups'}</h2>

		<div class="add-group-row">
			<input
				class="input"
				type="text"
				placeholder="{$lang('name') || 'Name'}..."
				bind:value={newGroupName}
				on:keydown={(e) => e.key === 'Enter' && addGroup()}
				style="flex: 1;"
			/>
			<button class="add-btn" on:click={addGroup} use:Ripple={$ripple}>
				<Icon icon="mdi:plus" height="1.2rem" />
				{$lang('add') || 'Add'}
			</button>
		</div>

		<!-- Existing groups -->
		{#each groups as group, gi (gi)}
			<div class="group-card">
				<div class="group-header">
					<input
						class="group-name-input"
						type="text"
						value={group.name}
						on:change={(e) => updateGroup(gi, 'name', e.currentTarget.value)}
					/>
					<input
						class="group-icon-input"
						type="text"
						value={group.icon}
						placeholder="mdi:gauge"
						on:change={(e) => updateGroup(gi, 'icon', e.currentTarget.value)}
						style="width: 8rem;"
					/>
					<button class="remove-group-btn" on:click={() => removeGroup(gi)} use:Ripple={$ripple}>
						<Icon icon="mdi:delete" height="1rem" />
					</button>
				</div>

				<!-- Sensor select -->
				<Select
					options={getAvailableSensors(gi)}
					placeholder="{$lang('add') || 'Add'} sensor / climate..."
					value={undefined}
					on:change={(event) => addSensor(gi, event.detail)}
				/>

				<!-- Sensor list -->
				{#if group.entity_ids.length > 0}
					<div class="sensor-items">
						{#each group.entity_ids as eid (eid)}
							{@const ent = $states?.[eid]}
							<div class="sensor-item">
								<Icon icon={ent?.attributes?.icon || 'mdi:gauge'} height="0.9rem" />
								<span class="sensor-label">{ent?.attributes?.friendly_name || eid}</span>
								<button
									class="remove-btn"
									on:click={() => removeSensor(gi, eid)}
									use:Ripple={$ripple}
								>
									<Icon icon="mdi:close" height="0.9rem" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		{#if groups.length === 0}
			<p class="hint">{$lang('add') || 'Add'} {$lang('group') || 'group'} ↑</p>
		{/if}

		<ConfigButtons {sel} />
	</Modal>
{/if}

<style>
	.add-group-row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.8rem;
	}

	.add-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.45rem 0.9rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(75, 166, 237, 0.5);
		background: rgba(75, 166, 237, 0.15);
		color: rgba(75, 166, 237, 1);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.group-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.6rem;
		padding: 0.7rem;
		margin-bottom: 0.6rem;
	}

	.group-header {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
		align-items: center;
	}

	.group-name-input {
		flex: 1;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.group-icon-input {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.remove-group-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
	}

	.remove-group-btn:hover {
		color: #ff6b6b;
	}

	.sensor-items {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.4rem;
	}

	.sensor-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.4rem;
		padding: 0.35rem 0.5rem;
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.sensor-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remove-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.35);
		cursor: pointer;
		padding: 0.15rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
	}

	.remove-btn:hover {
		color: #ff6b6b;
	}

	.hint {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.88rem;
		text-align: center;
		margin: 1rem 0;
	}

	.input {
		width: 100%;
		box-sizing: border-box;
	}
</style>
