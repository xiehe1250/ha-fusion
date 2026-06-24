<script lang="ts">
	import { SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import Button from '$lib/Main/Button.svelte';
	import HassButton from '$lib/Main/HassButton.svelte';
	import ConditionalMedia from '$lib/Main/ConditionalMedia.svelte';
	import PictureElements from '$lib/Main/PictureElements.svelte';
	import Camera from '$lib/Main/Camera.svelte';
	import Template from '$lib/Main/Template.svelte';
	import Bar from '$lib/Main/Bar.svelte';
	import Graph from '$lib/Main/Graph.svelte';
	import Configure from '$lib/Main/Configure.svelte';
	import Empty from '$lib/Main/Empty.svelte';
	import MapCard from '$lib/Main/MapCard.svelte';
	import SensorGroupCard from '$lib/Main/SensorGroupCard.svelte';
	import VehicleCard from '$lib/Main/VehicleCard.svelte';

	export let item: any;
	export let sectionName: string | undefined = undefined;

	const large = [
		'conditional_media',
		'picture_elements',
		'camera',
		'template',
		'bar',
		'graph',
		'map',
		'sensor_group',
		'vehicle'
	];
</script>

{#if item?.[SHADOW_ITEM_MARKER_PROPERTY_NAME] && large.includes(item?.type)}
	<div class="shadow"></div>
{/if}

{#if item?.type === 'configure'}
	<Configure sel={item} />
{:else if item?.type === 'button'}
	<Button sel={item} {sectionName} />
{:else if item?.type === 'hass_button'}
	<HassButton sel={item} {sectionName} />
{:else if item?.type === 'conditional_media'}
	<ConditionalMedia sel={item} />
{:else if item?.type === 'picture_elements'}
	<PictureElements sel={item} />
{:else if item?.type === 'camera'}
	<Camera sel={item} responsive={false} muted={true} controls={false} />
{:else if item?.type === 'template'}
	<Template sel={item} />
{:else if item?.type === 'bar'}
	<Bar sel={item} />
{:else if item?.type === 'graph'}
	<Graph sel={item} />
{:else if item?.type === 'map'}
	<MapCard sel={item} />
{:else if item?.type === 'sensor_group'}
	<SensorGroupCard sel={item} />
{:else if item?.type === 'vehicle'}
	<VehicleCard sel={item} />
{:else if item?.type === 'empty'}
	<Empty sel={item} />
{:else}
	<!-- if types are changed internally, don't break ui -->
	<Configure sel={{ id: item?.id }} />
{/if}

<style>
	.shadow {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		visibility: visible;
		background: rgba(0, 0, 0, 0.125);
		margin: 0;
		border-radius: 0.65rem;
	}
</style>
