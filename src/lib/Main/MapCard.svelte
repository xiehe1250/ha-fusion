<script lang="ts">
	import { states, editMode, motion, configuration, ripple, lang } from '$lib/Stores';
	import { onMount, onDestroy, tick } from 'svelte';
	import { openModal } from 'svelte-modals';
	import {
		Map as MapLibreMap,
		NavigationControl,
		Marker,
		Popup,
		type MapOptions
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { MapCardItem } from '$lib/Types';
	import { getName } from '$lib/Utils';

	export let sel: MapCardItem;

	const apiKey = $configuration?.addons?.maptiler?.apikey;

	const styles = {
		demo: 'https://demotiles.maplibre.org/style.json',
		light: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
		dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${apiKey}`
	};

	let mapContainer: HTMLDivElement;
	let map: MapLibreMap;
	let mode: 'demo' | 'light' | 'dark';

	// JS built-in Map: entity_id -> { marker, popup, el }
	const markerMap = new Map<string, { marker: Marker; popup: Popup; el: HTMLDivElement }>();

	$: configuredIds = sel?.entity_ids ?? [];
	$: defaultZoom = sel?.zoom ?? 13;

	/** Use configured entities, or auto-discover all trackable device_tracker / person entities */
	$: entity_ids =
		configuredIds.length > 0
			? configuredIds
			: Object.keys($states ?? {}).filter(
					(id) =>
						(id.startsWith('device_tracker.') || id.startsWith('person.')) &&
						$states?.[id]?.attributes?.latitude != null
				);

	/** Reactive: get live entities */
	$: trackedEntities = entity_ids
		.map((id) => $states?.[id] as HassEntity | undefined)
		.filter((e): e is HassEntity => !!e?.attributes?.latitude);

	/** Update markers when entities change */
	$: if (map && trackedEntities) {
		updateMarkers(trackedEntities);
	}

	onMount(async () => {
		// Ensure DOM container is ready
		await tick();
		if (!mapContainer) return;

		try {
			mode = !apiKey ? 'demo' : localStorage.getItem('darkMap') === 'true' ? 'dark' : 'light';

			const options: MapOptions = {
				container: mapContainer,
				style: styles[mode],
				zoom: defaultZoom,
				attributionControl: false,
				antialias: true,
				fadeDuration: 0
			};

			map = new MapLibreMap(options);

			// Navigation controls
			map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');

			map.on('error', () => {
				map.setStyle(styles.demo);
			});

			map.on('styleimagemissing', (event) => {
				map.addImage(event.id, { width: 0, height: 0, data: new Uint8Array(0) });
			});

			map.on('style.load', () => {
				updateMarkers(trackedEntities);
				fitBounds();
			});
		} catch (err) {
			console.error('[MapCard] Failed to initialize map:', err);
		}
	});

	onDestroy(() => {
		markerMap.forEach(({ marker }) => marker.remove());
		markerMap.clear();
		map?.remove();
	});

	/**
	 * Syncs markers with current entity states.
	 * Adds new markers, updates positions of existing ones,
	 * removes markers for entities no longer in list.
	 */
	function updateMarkers(entities: HassEntity[]) {
		const currentIds = new Set(entities.map((e) => e.entity_id));

		// Remove stale markers
		for (const [id, { marker }] of markerMap) {
			if (!currentIds.has(id)) {
				marker.remove();
				markerMap.delete(id);
			}
		}

		for (const entity of entities) {
			const lon = entity.attributes.longitude;
			const lat = entity.attributes.latitude;
			if (!lon || !lat) continue;

			if (markerMap.has(entity.entity_id)) {
				// Update existing marker position
				markerMap.get(entity.entity_id)!.marker.setLngLat([lon, lat]);
			} else {
				// Create new marker element
				const el = createMarkerElement(entity);
				const popup = new Popup({ closeButton: false, offset: 36 });
				const marker = new Marker({ element: el }).setLngLat([lon, lat]).addTo(map);

				el.addEventListener('click', (e) => {
					e.stopPropagation();
					if (popup.isOpen()) {
						popup.remove();
					} else {
						const name = getName(undefined, entity);
						const state = entity.state;
						const accuracy = entity.attributes.gps_accuracy
							? `<br/>±${entity.attributes.gps_accuracy}m`
							: '';
						popup
							.setHTML(`<strong>${name}</strong><br/>${state}${accuracy}`)
							.setLngLat([lon, lat])
							.addTo(map);
					}
				});

				markerMap.set(entity.entity_id, { marker, popup, el });
			}
		}
	}

	/**
	 * Creates a styled DOM element for a device marker.
	 * Uses entity_picture if available, otherwise ComputeIcon.
	 */
	function createMarkerElement(entity: HassEntity): HTMLDivElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'map-marker-wrapper';

		const pulse = document.createElement('div');
		pulse.className = 'map-marker-pulse';
		wrapper.appendChild(pulse);

		const btn = document.createElement('button');
		btn.className = 'map-marker-btn';
		btn.setAttribute('aria-label', getName(undefined, entity) ?? entity.entity_id);

		const pic = entity.attributes.entity_picture;
		if (pic) {
			btn.style.backgroundImage = `url("${pic}")`;
			btn.style.backgroundSize = 'cover';
		} else {
			// Fallback: show mdi icon letter
			btn.textContent = (getName(undefined, entity) ?? entity.entity_id)?.[0]?.toUpperCase() ?? '?';
		}

		wrapper.appendChild(btn);
		return wrapper;
	}

	/**
	 * Fits the map viewport to show all tracked entities.
	 * Falls back to world view if no entities.
	 */
	function fitBounds() {
		if (!map || trackedEntities.length === 0) return;

		if (trackedEntities.length === 1) {
			const e = trackedEntities[0];
			map.setCenter([e.attributes.longitude, e.attributes.latitude]);
			map.setZoom(defaultZoom);
			return;
		}

		const lons = trackedEntities.map((e) => e.attributes.longitude);
		const lats = trackedEntities.map((e) => e.attributes.latitude);
		map.fitBounds(
			[
				[Math.min(...lons), Math.min(...lats)],
				[Math.max(...lons), Math.max(...lats)]
			],
			{ padding: 60, maxZoom: defaultZoom }
		);
	}

	function handleEditClick() {
		if ($editMode) {
			openModal(() => import('$lib/Modal/MapCardConfig.svelte'), { sel });
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="map-card" style:cursor={$editMode ? 'pointer' : 'default'} on:click={handleEditClick}>
	<div bind:this={mapContainer} class="map-container" />

	{#if $editMode}
		<div class="edit-overlay">
			<span>⚙ {$lang('options')}</span>
		</div>
	{/if}
</div>

<style>
	.map-card {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: clamp(14rem, 20vw, 20rem);
		border-radius: 0.65rem;
		overflow: hidden;
	}

	.map-container {
		width: 100%;
		height: 100%;
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

	/* Marker styles — global because they live outside Svelte's scoped CSS */
	:global(.map-marker-wrapper) {
		position: relative;
		width: 3.2rem;
		height: 3.2rem;
		cursor: pointer;
	}

	:global(.map-marker-pulse) {
		position: absolute;
		inset: 0;
		background-color: rgba(5, 124, 255, 0.6);
		border-radius: 50%;
		animation: marker-pulse 4s ease-out infinite;
	}

	:global(.map-marker-btn) {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 2.5px solid white;
		background-color: #111;
		background-size: cover;
		background-position: center;
		color: white;
		font-size: 1.1rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
		cursor: pointer;
		transition: transform 150ms ease;
	}

	:global(.map-marker-btn:hover) {
		transform: scale(1.1);
	}

	/* MapLibre popup styling */
	:global(.maplibregl-popup-content) {
		border-radius: 0.6rem;
		padding: 0.6rem 0.9rem;
		font-family: inherit;
		font-size: 0.88rem;
		background: #1e1e2e;
		color: #e0e0e0;
	}

	:global(.maplibregl-popup-anchor-bottom .maplibregl-popup-tip) {
		border-top-color: #1e1e2e;
	}

	:global(.maplibregl-popup-anchor-top .maplibregl-popup-tip) {
		border-bottom-color: #1e1e2e;
	}

	@keyframes -global-marker-pulse {
		0% {
			transform: scale(0.1);
			opacity: 0;
		}
		30% {
			opacity: 0.6;
		}
		70% {
			transform: scale(1.8);
			opacity: 0;
		}
		100% {
			opacity: 0;
		}
	}
</style>
