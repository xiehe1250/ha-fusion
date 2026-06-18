<script lang="ts">
	import { dashboard, record, lang, autocompleteList, ripple, pasteContent } from '$lib/Stores';
	import { onDestroy } from 'svelte';
	import LovelaceCard from '$lib/Main/LovelaceCard.svelte';
	import CodeEditor from '$lib/Components/CodeEditor.svelte';
	import ConfigButtons from '$lib/Modal/ConfigButtons.svelte';
	import Modal from '$lib/Modal/Index.svelte';
	import { updateObj } from '$lib/Utils';
	import type { LovelaceItem } from '$lib/Types';
	import Ripple from 'svelte-ripple';
	import Icon from '@iconify/svelte';

	export let isOpen: boolean;
	export let sel: LovelaceItem | undefined = undefined;

	let value = sel?.yaml || '';
	let modalTransitionEnd = false;

	const EXAMPLES: Record<string, string> = {
		entities: `type: entities
title: Living Room
entities:
  - entity: light.living_room
  - entity: switch.tv_power
    name: TV
  - entity: sensor.temperature
    name: Temperature`,
		glance: `type: glance
title: Quick View
entities:
  - entity: sensor.outdoor_temperature
    name: Outdoor
  - entity: binary_sensor.front_door
    name: Door
  - entity: weather.home
    name: Weather`,
		markdown: `type: markdown
title: System Status
content: |
  ## Home Status
  
  **Time:** {{ now().strftime('%H:%M') }}
  
  **Lights on:** {{ states.light | selectattr('state','eq','on') | list | length }}
  
  **Doors open:** {{ states.binary_sensor | selectattr('state','eq','on') | list | length }}`,
		button: `type: button
entity: light.living_room
name: Living Room
tap_action:
  action: toggle
show_state: true`,
		sensor: `type: sensor
entity: sensor.temperature
name: Temperature
graph: line`
	};

	let selectedExample = '';

	function handleEvent() {
		modalTransitionEnd = true;
	}

	function set(key: string, event?: any) {
		sel = updateObj(sel, key, event);
		$dashboard = $dashboard;
	}

	function loadExample(key: string) {
		value = EXAMPLES[key];
		set('yaml', value);
		selectedExample = key;
	}

	onDestroy(() => $record());
</script>

{#if isOpen}
	<Modal on:transitionend={handleEvent}>
		<h1 slot="title">
			<Icon icon="mdi:code-braces" width="20" height="20" style="vertical-align: middle; margin-right: 0.3em;" />
			{$lang('lovelace') || 'Lovelace YAML'}
		</h1>

		<h2>{$lang('preview')}</h2>

		<div class="preview">
			<LovelaceCard {sel} />
		</div>

		<h2>{$lang('examples') || 'Examples'}</h2>

		<div class="example-buttons">
			{#each Object.entries(EXAMPLES) as [key]}
				<button
					class:selected={selectedExample === key}
					on:click={() => loadExample(key)}
					use:Ripple={$ripple}
				>
					{key}
				</button>
			{/each}
		</div>

		<h2>
			{$lang('yaml') || 'YAML'}
			<a
				target="_blank"
				href="https://www.home-assistant.io/dashboards/"
				style="font-size: 0.8rem; font-weight: 400; margin-left: 0.5em;"
			>
				Docs ↗
			</a>
		</h2>

		<CodeEditor
			bind:value
			type="yaml"
			transitionend={modalTransitionEnd}
			autocompleteList={$autocompleteList}
			on:change={(event) => {
				value = event.detail;
				set('yaml', value);
			}}
		/>

		<h2>{$lang('mobile')}</h2>

		<div class="button-container">
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
		overflow-y: scroll;
		max-height: 12rem;
		pointer-events: unset !important;
		background-color: rgb(0, 0, 0, 0.15);
		border-radius: 0.6rem;
		padding: 0.5rem;
	}

	.example-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.example-buttons button {
		padding: 0.4em 0.8em;
		border-radius: 0.4em;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: transparent;
		color: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		text-transform: capitalize;
		transition: all 150ms ease;
	}

	.example-buttons button:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.example-buttons button.selected {
		background: rgba(255, 192, 8, 0.2);
		border-color: rgba(255, 192, 8, 0.5);
		color: rgba(255, 192, 8, 1);
	}

	a {
		color: rgb(36, 167, 255);
		text-decoration: none;
	}

	.button-container {
		display: flex;
		gap: 0.5rem;
	}
</style>
