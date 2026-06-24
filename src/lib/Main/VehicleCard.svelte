<script lang="ts">
	import { states, editMode, connection } from '$lib/Stores';
	import { openModal } from 'svelte-modals';
	import Icon from '@iconify/svelte';
	import { callService } from 'home-assistant-js-websocket';
	import { getDomain } from '$lib/Utils';

	export let sel: any;

	// Configurable values with defaults
	$: name = sel?.name || 'My Vehicle';
	$: modelId = sel?.model_id || 'Toyota';
	$: vehicleType = sel?.vehicle_type || 'Gasoline';
	$: imageUrl = sel?.image_url || '';

	// Connected entity IDs
	$: lockEntity = sel?.lock_entity || '';
	$: acEntity = sel?.ac_entity || '';
	$: lightsEntity = sel?.lights_entity || '';
	$: odometerEntity = sel?.odometer_entity || '';
	$: rangeEntity = sel?.range_entity || '';
	$: fuelEntity = sel?.fuel_entity || '';
	$: doorEntity = sel?.door_entity || '';
	$: windowEntity = sel?.window_entity || '';

	// State resolution from HA store
	$: lockState = $states?.[lockEntity];
	$: acState = $states?.[acEntity];
	$: lightsState = $states?.[lightsEntity];
	$: odometerState = $states?.[odometerEntity];
	$: rangeState = $states?.[rangeEntity];
	$: fuelState = $states?.[fuelEntity];
	$: doorState = $states?.[doorEntity];
	$: windowState = $states?.[windowEntity];

	// Action triggers
	function toggleLock() {
		if (!lockEntity || !$connection) return;
		const service = lockState?.state === 'locked' ? 'unlock' : 'lock';
		callService($connection, 'lock', service, { entity_id: lockEntity });
	}

	function toggleAC() {
		if (!acEntity || !$connection) return;
		const domain = getDomain(acEntity) || 'switch';
		const service = acState?.state === 'on' ? 'turn_off' : 'turn_on';
		callService($connection, domain, service, { entity_id: acEntity });
	}

	function toggleLights() {
		if (!lightsEntity || !$connection) return;
		const domain = getDomain(lightsEntity) || 'switch';
		const service = lightsState?.state === 'on' ? 'turn_off' : 'turn_on';
		callService($connection, domain, service, { entity_id: lightsEntity });
	}

	function handleConfig() {
		if ($editMode) {
			openModal(() => import('$lib/Modal/VehicleConfig.svelte'), { sel });
		}
	}

	// Helper to format values
	function formatVal(val: any, unit: string = '') {
		if (val == null || val === 'unavailable' || val === 'unknown') return '--';
		const parsed = parseFloat(val);
		if (isNaN(parsed)) return val + unit;
		return parsed.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' ' + unit;
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="vehicle-card" on:click={handleConfig} class:edit-mode={$editMode}>
	<!-- Left Panel: Car Image & Basic Specs -->
	<div class="left-panel">
		<div class="car-image-container">
			{#if imageUrl}
				<img src={imageUrl} alt={name} class="car-image" />
			{:else}
				<div class="car-placeholder">
					<Icon icon="mdi:car-sports" height="100%" />
				</div>
			{/if}
		</div>
		<div class="car-title">{name}</div>
		<div class="specs-table">
			<div class="spec-row">
				<span class="spec-label">Vehicle</span>
				<span class="spec-val">{vehicleType}</span>
			</div>
			<div class="spec-row">
				<span class="spec-label">Model ID</span>
				<span class="spec-val">{modelId}</span>
			</div>
		</div>
	</div>

	<!-- Right Panel: Status & Control + Sensors -->
	<div class="right-panel">
		<div class="sub-panel-title">Status and Control</div>
		
		<div class="panels-grid">
			<!-- Controls column -->
			<div class="controls-col">
				<div class="ctrl-row">
					<button class="ctrl-btn" on:click|stopPropagation={toggleLock} disabled={$editMode}>
						<Icon icon={lockState?.state === 'locked' ? 'mdi:lock' : 'mdi:lock-open'} class="ctrl-icon" />
						<div class="ctrl-text">
							<span class="ctrl-label">Car Door Lock</span>
							<span class="ctrl-state">{lockState?.state === 'locked' ? 'Locked' : 'Unlocked'}</span>
						</div>
					</button>
				</div>

				<div class="ctrl-row">
					<div class="ctrl-switch-container">
						<Icon icon="mdi:air-conditioner" class="ctrl-icon" />
						<div class="ctrl-text">
							<span class="ctrl-label">Car A/C</span>
							<span class="ctrl-state">{acState?.state === 'on' ? 'On' : 'Off'}</span>
						</div>
						<label class="switch">
							<input type="checkbox" checked={acState?.state === 'on'} on:change|stopPropagation={toggleAC} disabled={$editMode} />
							<span class="slider"></span>
						</label>
					</div>
				</div>

				<div class="ctrl-row">
					<div class="ctrl-switch-container">
						<Icon icon="mdi:car-light-high" class="ctrl-icon" />
						<div class="ctrl-text">
							<span class="ctrl-label">Find Lights</span>
							<span class="ctrl-state">{lightsState?.state === 'on' ? 'Flashing' : 'Off'}</span>
						</div>
						<label class="switch">
							<input type="checkbox" checked={lightsState?.state === 'on'} on:change|stopPropagation={toggleLights} disabled={$editMode} />
							<span class="slider"></span>
						</label>
					</div>
				</div>
			</div>

			<!-- Sensor data column -->
			<div class="sensor-col">
				<div class="sensor-item-row">
					<span class="sensor-item-label">
						<Icon icon="mdi:car-door" /> Door Status
					</span>
					<span class="sensor-item-val" class:alert={doorState?.state === 'on'}>
						{doorState?.state === 'on' ? 'Open' : doorState?.state === 'off' ? 'Closed' : '--'}
					</span>
				</div>

				<div class="sensor-item-row">
					<span class="sensor-item-label">
						<Icon icon="mdi:car-window-open" /> Window Status
					</span>
					<span class="sensor-item-val" class:alert={windowState?.state === 'on'}>
						{windowState?.state === 'on' ? 'Open' : windowState?.state === 'off' ? 'Closed' : '--'}
					</span>
				</div>

				<div class="sensor-item-row">
					<span class="sensor-item-label">
						<Icon icon="mdi:gas-station" /> Fuel / Energy
					</span>
					<span class="sensor-item-val">{formatVal(fuelState?.state, '%')}</span>
				</div>

				<div class="sensor-item-row">
					<span class="sensor-item-label">
						<Icon icon="mdi:map-marker-distance" /> Range
					</span>
					<span class="sensor-item-val">{formatVal(rangeState?.state, 'km')}</span>
				</div>

				<div class="sensor-item-row">
					<span class="sensor-item-label">
						<Icon icon="mdi:counter" /> Odometer
					</span>
					<span class="sensor-item-val">{formatVal(odometerState?.state, 'km')}</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.vehicle-card {
		width: 100%;
		height: 100%;
		min-height: clamp(14rem, 25vw, 18rem);
		background: linear-gradient(135deg, rgba(25, 30, 40, 0.75), rgba(15, 18, 24, 0.85));
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.8rem;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: 1fr 1.3fr;
		gap: 1rem;
		padding: 1rem;
		color: #e0e6ed;
		overflow: hidden;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		transition: border-color 0.2s ease, transform 0.2s ease;
	}

	.vehicle-card.edit-mode {
		border-color: #ffc008;
		cursor: pointer;
	}

	.vehicle-card.edit-mode:hover {
		transform: scale(1.01);
	}

	/* Left Panel Styles */
	.left-panel {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.6rem;
		padding: 0.8rem;
		border: 1px solid rgba(255, 255, 255, 0.03);
	}

	.car-image-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 5rem;
		max-height: 8rem;
	}

	.car-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5));
	}

	.car-placeholder {
		color: rgba(255, 255, 255, 0.15);
		font-size: 4rem;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.car-title {
		font-size: 1.1rem;
		font-weight: 600;
		text-align: center;
		margin: 0.5rem 0;
		color: #fff;
		letter-spacing: 0.5px;
	}

	.specs-table {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.4rem;
		padding: 0.5rem;
	}

	.spec-row {
		display: flex;
		justify-content: space-between;
	}

	.spec-label {
		color: rgba(255, 255, 255, 0.45);
	}

	.spec-val {
		font-weight: 500;
		color: #e0e6ed;
	}

	/* Right Panel Styles */
	.right-panel {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.6rem;
		padding: 0.8rem;
		border: 1px solid rgba(255, 255, 255, 0.03);
	}

	.sub-panel-title {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 0.6rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		padding-bottom: 0.3rem;
	}

	.panels-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
		flex: 1;
	}

	.controls-col, .sensor-col {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sensor-col {
		background: rgba(0, 0, 0, 0.15);
		padding: 0.5rem;
		border-radius: 0.4rem;
		justify-content: space-between;
	}

	/* Controls row components */
	.ctrl-row {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.4rem;
		overflow: hidden;
		display: flex;
		border: 1px solid rgba(255, 255, 255, 0.02);
	}

	.ctrl-btn {
		width: 100%;
		background: transparent;
		border: none;
		padding: 0.5rem;
		color: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-align: left;
		transition: background 0.2s ease;
	}

	.ctrl-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.04);
	}

	.ctrl-switch-container {
		width: 100%;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.ctrl-icon {
		font-size: 1.3rem;
		color: #4ba6ed;
	}

	.ctrl-text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.ctrl-label {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.4);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ctrl-state {
		font-size: 0.75rem;
		font-weight: 600;
		color: #fff;
	}

	/* Toggle Switch styling */
	.switch {
		position: relative;
		display: inline-block;
		width: 2.2rem;
		height: 1.2rem;
		flex-shrink: 0;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(255, 255, 255, 0.1);
		transition: .2s;
		border-radius: 1.2rem;
	}

	.slider:before {
		position: absolute;
		content: "";
		height: 0.9rem;
		width: 0.9rem;
		left: 0.15rem;
		bottom: 0.15rem;
		background-color: white;
		transition: .2s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: #4ba6ed;
	}

	input:checked + .slider:before {
		transform: translateX(1rem);
	}

	/* Sensor items */
	.sensor-item-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		padding: 0.35rem 0.2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}

	.sensor-item-row:last-child {
		border-bottom: none;
	}

	.sensor-item-label {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: rgba(255, 255, 255, 0.45);
	}

	.sensor-item-val {
		font-weight: 600;
		color: #fff;
	}

	.sensor-item-val.alert {
		color: #ff5252;
	}

	/* Responsive design for smaller spaces */
	@media all and (max-width: 550px) {
		.vehicle-card {
			grid-template-columns: 1fr;
		}
	}
</style>
