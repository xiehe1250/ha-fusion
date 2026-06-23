<script lang="ts">
	import { states, editMode, motion, lang } from '$lib/Stores';
	import { openModal } from 'svelte-modals';
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { SensorGroupItem } from '$lib/Types';
	import { getName } from '$lib/Utils';
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	export let sel: SensorGroupItem;

	let activeTab = 0;

	$: groups = sel?.groups ?? [];
	$: currentGroup = groups[activeTab] ?? groups[0] ?? null;
	$: sensors = currentGroup?.entity_ids?.map((id) => $states?.[id]).filter(Boolean) ?? [];

	/** Get a sensible min/max range for progress bar based on device_class or entity type */
	function getRange(entity: HassEntity): [number, number] {
		if (entity.entity_id.startsWith('climate.')) return [-10, 50];
		const dc = entity.attributes.device_class;
		const unit = entity.attributes.unit_of_measurement;
		if (dc === 'temperature' || unit === '°C') return [-10, 50];
		if (dc === 'humidity' || unit === '%') return [0, 100];
		if (dc === 'pm25' || unit === 'μg/m³') return [0, 150];
		if (dc === 'carbon_dioxide' || unit === 'ppm') return [0, 2500];
		if (dc === 'power' || unit === 'W') return [0, 3500];
		if (dc === 'energy' || unit === 'kWh') return [0, 1000];
		if (dc === 'illuminance' || unit === 'lx') return [0, 1000];
		if (dc === 'voltage' || unit === 'V') return [0, 250];
		if (dc === 'current' || unit === 'A') return [0, 16];
		if (dc === 'battery') return [0, 100];
		if (unit === 'km') return [0, 100];
		return [0, 100];
	}

	/** For climate entities, use current_temperature; otherwise use state */
	function getDisplayValue(entity: HassEntity): string {
		if (entity.entity_id.startsWith('climate.')) {
			const temp = entity.attributes.current_temperature;
			return temp != null ? String(temp) : entity.state;
		}
		return entity.state;
	}

	function getDisplayUnit(entity: HassEntity): string | undefined {
		if (entity.entity_id.startsWith('climate.')) {
			return entity.attributes.current_temperature != null ? '°C' : undefined;
		}
		return entity.attributes.unit_of_measurement;
	}

	function formatState(entity: HassEntity): string {
		const raw = getDisplayValue(entity);
		const val = parseFloat(raw);
		if (isNaN(val)) return raw;
		if (Math.abs(val) >= 100) return val.toFixed(0);
		if (Math.abs(val) >= 10) return val.toFixed(1);
		if (Math.abs(val) >= 1) return val.toFixed(1);
		return val.toFixed(2);
	}

	function getPercent(entity: HassEntity): number {
		const val = parseFloat(getDisplayValue(entity));
		if (isNaN(val)) return 0;
		const [min, max] = getRange(entity);
		return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
	}

	function getBarColor(entity: HassEntity): string {
		const val = parseFloat(getDisplayValue(entity));
		if (isNaN(val)) return 'rgba(255,255,255,0.3)';
		const dc = entity.attributes.device_class;
		const unit = entity.attributes.unit_of_measurement;

		// climate entities and temperature sensors use temperature colors
		if (entity.entity_id.startsWith('climate.') || dc === 'temperature' || unit === '°C') {
			if (val < 18) return '#4A90E2';
			if (val < 26) return '#66BB6A';
			if (val < 30) return '#FF9800';
			return '#FF5252';
		}
		if (dc === 'humidity' || unit === '%') {
			if (val < 30) return '#FF9800';
			if (val < 60) return '#66BB6A';
			return '#4A90E2';
		}
		if (dc === 'battery') {
			if (val < 20) return '#FF5252';
			if (val < 50) return '#FF9800';
			return '#66BB6A';
		}
		if (dc === 'pm25' || unit === 'μg/m³') {
			if (val <= 35) return '#66BB6A';
			if (val <= 75) return '#FF9800';
			return '#FF5252';
		}
		if (dc === 'carbon_dioxide' || unit === 'ppm') {
			if (val <= 800) return '#66BB6A';
			if (val <= 1500) return '#FF9800';
			return '#FF5252';
		}
		if (dc === 'power' || unit === 'W') return '#FFB74D';
		if (dc === 'energy' || unit === 'kWh') return '#FFB74D';
		if (unit === 'km') return '#4A90E2';
		return 'rgba(255,255,255,0.55)';
	}

	function getDefaultIcon(entity: HassEntity): string {
		if (entity.entity_id.startsWith('climate.')) return 'mdi:thermometer';
		const dc = entity.attributes.device_class;
		const iconMap: Record<string, string> = {
			temperature: 'mdi:thermometer',
			humidity: 'mdi:water-percent',
			pm25: 'mdi:blur',
			carbon_dioxide: 'mdi:molecule-co2',
			battery: 'mdi:battery',
			power: 'mdi:flash',
			illuminance: 'mdi:brightness-5',
			voltage: 'mdi:sine-wave',
			current: 'mdi:current-ac',
			energy: 'mdi:lightning-bolt',
			signal_strength: 'mdi:wifi',
			volatile_organic_compounds: 'mdi:flask'
		};
		return entity.attributes.icon || (dc ? iconMap[dc] : undefined) || 'mdi:gauge';
	}

	function handleClick() {
		if ($editMode) {
			openModal(() => import('$lib/Modal/SensorGroupConfig.svelte'), { sel });
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="sensor-group" on:click={handleClick} style:cursor={$editMode ? 'pointer' : 'default'}>
	{#if groups.length > 1}
		<div class="tabs">
			{#each groups as group, i}
				<button
					class="tab"
					class:active={activeTab === i}
					on:click|stopPropagation={() => (activeTab = i)}
				>
					<Icon icon={group.icon || 'mdi:gauge'} height="1rem" />
					<span>{group.name}</span>
				</button>
			{/each}
		</div>
	{:else if groups.length === 1}
		<div class="tabs">
			<div class="tab active">
				<Icon icon={groups[0].icon || 'mdi:gauge'} height="1rem" />
				<span>{groups[0].name}</span>
			</div>
		</div>
	{/if}

	<div class="sensor-list">
		{#if sensors.length > 0}
			{#each sensors as entity (entity.entity_id)}
				{@const pct = getPercent(entity)}
				{@const color = getBarColor(entity)}
				<div class="sensor-row" transition:fade={{ duration: 200 }}>
					<div class="sensor-icon">
						<Icon icon={getDefaultIcon(entity)} height="1.1rem" />
					</div>
					<div class="sensor-info">
						<div class="sensor-name">{getName(undefined, entity)}</div>
						<div class="sensor-bar-track">
							<div
								class="sensor-bar-fill"
								style:width="{pct}%"
								style:background-color={color}
								style:transition="width {$motion}ms ease"
							></div>
						</div>
					</div>
					<div class="sensor-value">
						{formatState(entity)}
						{#if getDisplayUnit(entity)}
							<span class="unit">{getDisplayUnit(entity)}</span>
						{/if}
					</div>
				</div>
			{/each}
		{:else}
			<div class="empty">
				<Icon icon="mdi:gauge-empty" height="2rem" />
				<span>{$lang('no_data') || 'No sensors'}</span>
			</div>
		{/if}
	</div>

	{#if $editMode}
		<div class="edit-overlay">
			<span>⚙ {$lang('options')}</span>
		</div>
	{/if}
</div>

<style>
	.sensor-group {
		position: relative;
		height: 100%;
		min-height: clamp(14rem, 20vw, 20rem);
		display: flex;
		flex-direction: column;
		background-color: var(--theme-button-background-color-off, rgba(255, 255, 255, 0.06));
		border-radius: 0.65rem;
		overflow: hidden;
	}

	.tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}

	.tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.55rem 0.4rem;
		border: none;
		background: none;
		color: rgba(255, 255, 255, 0.4);
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			color 150ms ease,
			background 150ms ease;
		border-bottom: 2px solid transparent;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tab:hover {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.03);
	}

	.tab.active {
		color: rgba(255, 255, 255, 0.95);
		border-bottom-color: rgba(75, 166, 237, 0.8);
	}

	.sensor-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.3rem 0.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.sensor-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.2rem;
		border-radius: 0.4rem;
	}

	.sensor-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.sensor-icon {
		flex-shrink: 0;
		width: 1.8rem;
		height: 1.8rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.7);
	}

	.sensor-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.sensor-name {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.65);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sensor-bar-track {
		height: 4px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 2px;
		overflow: hidden;
	}

	.sensor-bar-fill {
		height: 100%;
		border-radius: 2px;
		min-width: 2px;
	}

	.sensor-value {
		flex-shrink: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		text-align: right;
	}

	.sensor-value .unit {
		font-size: 0.7rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.45);
		margin-left: 1px;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex: 1;
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.88rem;
	}

	.edit-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 1rem;
		font-weight: 600;
		pointer-events: none;
		border-radius: 0.65rem;
	}

	/* Scrollbar */
	.sensor-list::-webkit-scrollbar {
		width: 3px;
	}

	.sensor-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.sensor-list::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 2px;
	}
</style>
