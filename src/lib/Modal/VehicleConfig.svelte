<script lang="ts">
	import { dashboard, record, lang, ripple, entityList } from '$lib/Stores';
	import { onDestroy } from 'svelte';
	import Modal from '$lib/Modal/Index.svelte';
	import Select from '$lib/Components/Select.svelte';
	import ConfigButtons from '$lib/Modal/ConfigButtons.svelte';
	import { updateObj } from '$lib/Utils';
	import Ripple from 'svelte-ripple';

	export let isOpen: boolean;
	export let sel: any;

	function set(key: string, value?: any) {
		sel = updateObj(sel, key, value);
		$dashboard = $dashboard;
	}

	// Entity options sorted alphabetically
	$: lockOptions = [...$entityList('lock')].sort((a, b) => a.label.localeCompare(b.label));
	$: acOptions = [...$entityList('switch'), ...$entityList('input_boolean'), ...$entityList('climate')].sort((a, b) => a.label.localeCompare(b.label));
	$: lightsOptions = [...$entityList('switch'), ...$entityList('input_boolean')].sort((a, b) => a.label.localeCompare(b.label));
	$: sensorOptions = [...$entityList('sensor')].sort((a, b) => a.label.localeCompare(b.label));
	$: binarySensorOptions = [...$entityList('binary_sensor')].sort((a, b) => a.label.localeCompare(b.label));

	// Pre-fill helper (auto-matches based on keywords like "sai_na" or "kai_mei_rui")
	function autoDiscover(keyword: string) {
		if (!keyword) return;
		const findEntity = (list: any[], sub: string) => {
			const found = list.find(o => o.id.includes(keyword) && o.id.includes(sub));
			return found ? found.id : '';
		};

		// Auto discover lock
		const lock = findEntity(lockOptions, 'men_suo');
		if (lock) set('lock_entity', lock);

		// Auto discover AC
		const ac = findEntity(acOptions, 'kong_diao');
		if (ac) set('ac_entity', ac);

		// Auto discover lights
		const lights = findEntity(lightsOptions, 'shan_deng');
		if (lights) set('lights_entity', lights);

		// Auto discover odometer
		const odo = findEntity(sensorOptions, 'zong_li_cheng');
		if (odo) set('odometer_entity', odo);

		// Auto discover range
		const rng = findEntity(sensorOptions, 'xu_hang_li_cheng');
		if (rng) set('range_entity', rng);

		// Auto discover fuel
		const fuel = findEntity(sensorOptions, 'sheng_yu_you_liang');
		if (fuel) set('fuel_entity', fuel);

		// Auto discover door
		const door = findEntity(binarySensorOptions, 'men_zhuang_tai');
		if (door) set('door_entity', door);

		// Auto discover window
		const win = findEntity(binarySensorOptions, 'chuang_zhuang_tai');
		if (win) set('window_entity', win);
	}

	onDestroy(() => $record());
</script>

{#if isOpen}
	<Modal size="large">
		<h1 slot="title">Vehicle Config ({sel?.name || 'New Vehicle'})</h1>

		<div class="config-grid">
			<!-- Column 1: Info -->
			<div class="config-sec">
				<h2>Basic Specs</h2>
				<label class="label-group">
					<span>Name</span>
					<input class="input" type="text" value={sel?.name || ''} on:input={(e) => set('name', e.currentTarget.value)} placeholder="e.g. 赛那" />
				</label>

				<label class="label-group">
					<span>Model ID</span>
					<input class="input" type="text" value={sel?.model_id || ''} on:input={(e) => set('model_id', e.currentTarget.value)} placeholder="e.g. Sienna" />
				</label>

				<label class="label-group">
					<span>Vehicle Type</span>
					<input class="input" type="text" value={sel?.vehicle_type || ''} on:input={(e) => set('vehicle_type', e.currentTarget.value)} placeholder="e.g. Hybrid / Electric" />
				</label>

				<label class="label-group">
					<span>Car Image URL</span>
					<input class="input" type="text" value={sel?.image_url || ''} on:input={(e) => set('image_url', e.currentTarget.value)} placeholder="e.g. /local/car.png" />
				</label>

				<div class="discovery-sec">
					<h3>Quick Auto-Fill</h3>
					<p>Enter a keyword in your vehicle's entity IDs to auto-match HA entities:</p>
					<div class="discovery-row">
						<button class="disc-btn" on:click={() => autoDiscover('sai_na')} use:Ripple={$ripple}>Auto Fill 赛那</button>
						<button class="disc-btn" on:click={() => autoDiscover('kai_mei_rui')} use:Ripple={$ripple}>Auto Fill 凯美瑞</button>
					</div>
				</div>
			</div>

			<!-- Column 2: Controls & Sensors -->
			<div class="config-sec">
				<h2>Status & Control Entities</h2>
				
				<label class="select-group">
					<span>Door Lock Entity</span>
					<Select placeholder="Select lock entity" options={lockOptions} value={sel?.lock_entity} on:change={(e) => set('lock_entity', e.detail)} />
				</label>

				<label class="select-group">
					<span>AC Switch/Climate Entity</span>
					<Select placeholder="Select AC entity" options={acOptions} value={sel?.ac_entity} on:change={(e) => set('ac_entity', e.detail)} />
				</label>

				<label class="select-group">
					<span>Find Lights Entity</span>
					<Select placeholder="Select lights entity" options={lightsOptions} value={sel?.lights_entity} on:change={(e) => set('lights_entity', e.detail)} />
				</label>

				<h2>Sensors</h2>

				<label class="select-group">
					<span>Door Status (Binary Sensor)</span>
					<Select placeholder="Select door sensor" options={binarySensorOptions} value={sel?.door_entity} on:change={(e) => set('door_entity', e.detail)} />
				</label>

				<label class="select-group">
					<span>Window Status (Binary Sensor)</span>
					<Select placeholder="Select window sensor" options={binarySensorOptions} value={sel?.window_entity} on:change={(e) => set('window_entity', e.detail)} />
				</label>

				<label class="select-group">
					<span>Fuel / Battery level (%)</span>
					<Select placeholder="Select fuel sensor" options={sensorOptions} value={sel?.fuel_entity} on:change={(e) => set('fuel_entity', e.detail)} />
				</label>

				<label class="select-group">
					<span>Range (km)</span>
					<Select placeholder="Select range sensor" options={sensorOptions} value={sel?.range_entity} on:change={(e) => set('range_entity', e.detail)} />
				</label>

				<label class="select-group">
					<span>Odometer (km)</span>
					<Select placeholder="Select odometer sensor" options={sensorOptions} value={sel?.odometer_entity} on:change={(e) => set('odometer_entity', e.detail)} />
				</label>
			</div>
		</div>

		<ConfigButtons {sel} />
	</Modal>
{/if}

<style>
	.config-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin: 1rem 0;
		max-height: 60vh;
		overflow-y: auto;
		padding-right: 0.5rem;
	}

	.config-sec {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h2 {
		font-size: 1.1rem;
		margin: 0.5rem 0 0 0;
		color: #fff;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 0.3rem;
	}

	.label-group, .select-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.label-group span, .select-group span {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.discovery-sec {
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 0.6rem;
		padding: 0.8rem;
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.discovery-sec h3 {
		font-size: 0.9rem;
		margin: 0;
		color: #fff;
	}

	.discovery-sec p {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.discovery-row {
		display: flex;
		gap: 0.8rem;
	}

	.disc-btn {
		background: #ffc008;
		color: #1d1b18;
		border: none;
		border-radius: 0.4rem;
		padding: 0.5rem 0.8rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.disc-btn:hover {
		opacity: 0.9;
	}
</style>
