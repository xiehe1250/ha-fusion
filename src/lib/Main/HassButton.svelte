<script lang="ts">
	import ComputeIcon from '$lib/Components/ComputeIcon.svelte';
	import StateLogic from '$lib/Components/StateLogic.svelte';
	import {
		connection,
		editMode,
		itemHeight,
		lang,
		motion,
		onStates,
		climateHvacActionToMode,
		ripple,
		states,
		templates,
		config,
		selectedLanguage,
		calendarView,
		calendarFirstDay
	} from '$lib/Stores';
	import { getDomain, getName, getTogglableService } from '$lib/Utils';
	import Icon, { loadIcon } from '@iconify/svelte';
	import { callService, type HassEntity } from 'home-assistant-js-websocket';
	import { marked } from 'marked';
	import { onDestroy } from 'svelte';
	import { openModal } from 'svelte-modals';
	import Ripple from 'svelte-ripple';
	import parser from 'js-yaml';

	export let demo: string | undefined = undefined;
	export let sel: any;
	export let sectionName: string | undefined = undefined;

	$: entity_id = demo || sel?.entity_id;
	$: template = $templates?.[sel?.id];
	$: icon = (sel?.template?.icon && template?.icon?.output) || sel?.icon;
	$: color = (sel?.template?.color && template?.color?.output) || sel?.color;
	$: marquee = sel?.marquee;
	$: more_info = sel?.more_info;

	let entity: HassEntity;
	let contentWidth: number;
	let container: HTMLDivElement;
	let loading: boolean;
	let resetLoading: ReturnType<typeof setTimeout> | null;
	let stateOn: boolean;

	/** display loader if no state change has occurred within `$motion`ms */
	let delayLoading: ReturnType<typeof setTimeout> | null;

	/** long press detection */
	let longPressTimer: ReturnType<typeof setTimeout> | null;
	let isLongPress: boolean = false;
	const LONG_PRESS_DURATION = 600; // ms

	$: if (entity_id && $states?.[entity_id]?.last_updated !== entity?.last_updated) {
		entity = $states?.[entity_id];

		loading = false;

		if (delayLoading) {
			clearTimeout(delayLoading);
			delayLoading = null;
		}

		if (resetLoading) {
			clearTimeout(resetLoading);
			resetLoading = null;
		}
	}

	$: attributes = entity?.attributes;

	$: iconColor = color
		? color
		: attributes?.hs_color
			? `hsl(${attributes?.hs_color}%, 50%)`
			: 'rgb(75, 166, 237)';

	$: image = icon?.includes('.');

	$: if (sel?.template?.set_state && template?.set_state?.output) {
		stateOn = $onStates?.includes(template?.set_state?.output?.toLocaleLowerCase());
	} else if (attributes?.hvac_action) {
		stateOn = $onStates?.includes(
			$climateHvacActionToMode?.[attributes?.hvac_action]?.toLocaleLowerCase()
		);
	} else if (attributes?.in_progress) {
		stateOn = typeof attributes.in_progress === 'number';
	} else {
		stateOn = $onStates?.includes(entity?.state?.toLocaleLowerCase());
	}

	function triggerBounce() {
		if (container) {
			container.classList.remove('bouncing');
			// Force reflow
			void container.offsetWidth;
			container.classList.add('bouncing');
			// Remove class after animation completes
			setTimeout(() => {
				container?.classList.remove('bouncing');
			}, 900);
		}
	}

	function handlePointerDown(event: PointerEvent) {
		isLongPress = false;
		longPressTimer = setTimeout(() => {
			isLongPress = true;
			// Trigger haptic feedback if available
			if (navigator.vibrate) {
				navigator.vibrate(50);
			}
			openConfigModal();
		}, LONG_PRESS_DURATION);
	}

	function handlePointerUp(event: PointerEvent) {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function handlePointerLeave(event: PointerEvent) {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		isLongPress = false;
	}

	function openConfigModal() {
		if ($editMode) return;
		
		const domain = getDomain(sel?.entity_id);
		switch (domain) {
			case 'light':
				openModal(() => import('$lib/Modal/LightModal.svelte'), { sel });
				break;
			case 'climate':
				openModal(() => import('$lib/Modal/ClimateModal.svelte'), { sel });
				break;
			case 'input_boolean':
			case 'remote':
			case 'siren':
			case 'switch':
				openModal(() => import('$lib/Modal/SwitchModal.svelte'), { sel });
				break;
			case 'script':
				openModal(() => import('$lib/Modal/ScriptModal.svelte'), { sel });
				break;
			case 'automation':
				openModal(() => import('$lib/Modal/AutomationModal.svelte'), { sel });
				break;
			case 'input_number':
			case 'number':
				openModal(() => import('$lib/Modal/InputNumberModal.svelte'), { sel });
				break;
			case 'input_select':
			case 'select':
				openModal(() => import('$lib/Modal/InputSelectModal.svelte'), { sel });
				break;
			case 'vacuum':
				openModal(() => import('$lib/Modal/VacuumModal.svelte'), { sel });
				break;
			case 'media_player':
				openModal(() => import('$lib/Modal/MediaPlayer.svelte'), { sel });
				break;
			default:
				// For other entities, open sensor modal as fallback
				openModal(() => import('$lib/Modal/SensorModal.svelte'), { sel });
				break;
		}
	}

	function toggle() {
		triggerBounce();

		if (sel?.template?.service && template?.service?.output) {
			try {
				const _template = parser.load(template?.service?.output) as {
					service: string;
					data: Record<string, string | number | boolean>;
				};

				if (_template?.service) {
					const [domain, service] = _template.service.split('.');
					callService($connection, domain, service, _template?.data);
				}
			} catch (error) {
				console.error('Template service YAML parse error:', error);
			}

			return;
		}

		const service = getTogglableService(entity);

		if (service) {
			const [_domain, _service] = service.split('.');
			callService($connection, _domain, _service, {
				entity_id
			});

			delayLoading = setTimeout(() => {
				loading = true;
			}, $motion);

			resetLoading = setTimeout(() => {
				loading = false;
			}, 20_000);
		} else {
			handleClickEvent();
		}
	}

	function handlePointer() {
		handleEvent({ type: 'preload' });
	}

	async function handleEvent(event: any) {
		if (event.type === 'click') {
			await handleClickEvent();
		} else {
			await handlePointerEvent();
		}
	}

	async function handleClickEvent() {
		if ($editMode) {
			openModal(() => import('$lib/Modal/HassButtonConfig.svelte'), {
				demo: entity_id,
				sel,
				sectionName
			});
		} else if (more_info === false) {
			toggle();
		} else {
			switch (getDomain(sel?.entity_id)) {
				case 'light':
					openModal(() => import('$lib/Modal/LightModal.svelte'), {
						sel: sel
					});
					break;
				case 'input_boolean':
				case 'remote':
				case 'siren':
				case 'switch':
					openModal(() => import('$lib/Modal/SwitchModal.svelte'), { sel });
					break;
				case 'script':
					openModal(() => import('$lib/Modal/ScriptModal.svelte'), { sel });
					break;
				case 'automation':
					openModal(() => import('$lib/Modal/AutomationModal.svelte'), { sel });
					break;
				case 'calendar': {
					$calendarFirstDay =
						'weekInfo' in Intl.Locale.prototype
							? (new Intl.Locale($selectedLanguage) as any)?.weekInfo.firstDay
							: (await import('weekstart')).getWeekStartByLocale($selectedLanguage);

					$calendarView = localStorage.getItem('calendar');

					openModal(() => import('$lib/Modal/CalendarModal.svelte'), { sel });
					break;
				}
				case 'air_quality':
				case 'date':
				case 'time':
				case 'event':
				case 'image_processing':
				case 'mailbox':
				case 'sensor':
				case 'binary_sensor':
				case 'stt':
				case 'weather':
				case 'button':
				case 'scene':
				case 'schedule':
				case 'sun':
				case 'person':
				case 'zone':
				case 'input_button':
					openModal(() => import('$lib/Modal/SensorModal.svelte'), { sel });
					break;
				case 'update':
					openModal(() => import('$lib/Modal/UpdateModal.svelte'), { sel });
					break;
				case 'input_number':
				case 'number':
					openModal(() => import('$lib/Modal/InputNumberModal.svelte'), { sel });
					break;
				case 'input_datetime':
				case 'datetime':
					openModal(() => import('$lib/Modal/InputDateModal.svelte'), { sel });
					break;
				case 'input_select':
				case 'select':
					openModal(() => import('$lib/Modal/InputSelectModal.svelte'), { sel });
					break;
				case 'input_text':
				case 'text':
					openModal(() => import('$lib/Modal/InputTextModal.svelte'), { sel });
					break;
				case 'timer':
					openModal(() => import('$lib/Modal/TimerModal.svelte'), { sel });
					break;
				case 'vacuum':
					openModal(() => import('$lib/Modal/VacuumModal.svelte'), { sel });
					break;
				case 'lawn_mower':
					openModal(() => import('$lib/Modal/LawnMowerModal.svelte'), { sel });
					break;
				case 'valve':
					openModal(() => import('$lib/Modal/ValveModal.svelte'), { sel });
					break;
				case 'image':
					openModal(() => import('$lib/Modal/ImageModal.svelte'), { sel });
					break;
				case 'todo':
					openModal(() => import('$lib/Modal/TodoModal.svelte'), { sel });
					break;
				case 'counter':
					openModal(() => import('$lib/Modal/CounterModal.svelte'), { sel });
					break;
				case 'alarm_control_panel':
					openModal(() => import('$lib/Modal/AlarmControlPanelModal.svelte'), { sel });
					break;
				case 'lock':
					openModal(() => import('$lib/Modal/LockModal.svelte'), { sel });
					break;
				case 'climate':
					openModal(() => import('$lib/Modal/ClimateModal.svelte'), { sel });
					break;
				case 'camera':
					openModal(() => import('$lib/Modal/CameraModal.svelte'), { sel });
					break;
				case 'water_heater':
					openModal(() => import('$lib/Modal/WaterHeaterModal.svelte'), { sel });
					break;
				case 'humidifier':
					openModal(() => import('$lib/Modal/HumidifierModal.svelte'), { sel });
					break;
				case 'media_player':
					openModal(() => import('$lib/Modal/MediaPlayer.svelte'), {
						selected: sel
					});
					break;
				case 'group':
					openModal(() => import('$lib/Modal/GroupModal.svelte'), { sel });
					break;
				case 'device_tracker': {
					if ($states?.[sel?.entity_id]?.attributes?.source_type === 'gps') {
						openModal(() => import('$lib/Modal/DeviceTrackerModal.svelte'), { sel });
					} else {
						openModal(() => import('$lib/Modal/SensorModal.svelte'), { sel });
					}
					break;
				}
				case 'cover':
					openModal(() => import('$lib/Modal/CoverModal.svelte'), {
						selected: sel
					});
					break;
				case 'fan':
					openModal(() => import('$lib/Modal/FanModal.svelte'), {
						selected: sel
					});
					break;
				default:
					openModal(() => import('$lib/Modal/Unknown.svelte'), {
						selected: sel
					});
					break;
			}
		}
	}

	async function handlePointerEvent() {
		if ($editMode) {
			await import('$lib/Modal/HassButtonConfig.svelte');
		} else {
			switch (getDomain(sel?.entity_id)) {
				case 'light':
					await import('$lib/Modal/LightModal.svelte');
					break;
				case 'switch':
					await import('$lib/Modal/SwitchModal.svelte');
					break;
				case 'climate':
					await import('$lib/Modal/ClimateModal.svelte');
					break;
				case 'media_player':
					await import('$lib/Modal/MediaPlayer.svelte');
					break;
				default:
					await import('$lib/Modal/Unknown.svelte');
					break;
			}
		}
	}

	$: if ($config?.state === 'RUNNING' && sel?.template) {
		Object.entries(sel?.template as Record<string, string>).forEach(([key, value]) => {
			const compareTemplate = value === template?.[key]?.input;
			const compareEntityId = sel?.entity_id === template?.[key]?.entity_id;
			if (compareTemplate && compareEntityId) return;
			renderTemplate(key, value);
		});
	}

	let unsubscribe: () => void;

	async function renderTemplate(key: string, value: string) {
		if (!$connection || !sel?.id) return;

		try {
			unsubscribe = await $connection.subscribeMessage(
				(response: { result: string } | { error: string; level: 'ERROR' | 'WARNING' }) => {
					let data: any = {
						input: value
					};

					if ('result' in response) {
						data.output =
							key === 'state' || key === 'name'
								? marked.parseInline(String(response.result))
								: String(response.result);
					} else if (response?.level === 'ERROR') {
						console.error(response.error);
						data.error = response.error;
					}

					data.entity_id = sel?.entity_id;

					$templates[sel?.id] = { ...$templates[sel?.id], [key]: data };
				},
				{
					type: 'render_template',
					template: value,
					report_errors: true,
					variables: {
						entity_id: sel?.entity_id
					}
				}
			);
		} catch (error) {
			console.error('Template error:', error);
		}
	}

	onDestroy(() => unsubscribe?.());
</script>

<div
	class="container"
	bind:this={container}
	data-state={stateOn}
	tabindex="-1"
	style={!$editMode ? 'cursor: pointer;' : ''}
	style:min-height="{$itemHeight}px"
	on:pointerenter={handlePointer}
	on:pointerdown={(event) => {
		handlePointer();
		handlePointerDown(event);
	}}
	on:pointerup={handlePointerUp}
	on:pointerleave={handlePointerLeave}
	on:click|stopPropagation={(event) => {
		if (isLongPress) {
			// Prevent click after long press
			isLongPress = false;
			return;
		}
		if (!$editMode) {
			toggle();
		} else {
			handleEvent(event);
		}
	}}
	on:keydown
	role="button"
	use:Ripple={{
		...$ripple,
		color: !$editMode
			? stateOn
				? 'rgba(255, 255, 255, 0.18)'
				: 'rgba(255, 255, 255, 0.1)'
			: 'rgba(0, 0, 0, 0)'
	}}
>
	<div class="top">
		<div
			class="icon"
			data-state={stateOn}
			data-domain={getDomain(entity_id)}
			style:--icon-color={iconColor}
			style:background-color={sel?.template?.color && template?.color?.output
				? template?.color?.output
				: undefined}
			style:background-image={!icon && attributes?.entity_picture
				? `url(${attributes?.entity_picture})`
				: image && icon
					? `url(${icon})`
					: 'none'}
			class:image
		>
			{#if loading}
				<img src="loader.svg" alt="loading" style="margin:0 auto" />
			{:else if image || (!icon && attributes?.entity_picture)}
				&nbsp;
			{:else if icon}
				{#await loadIcon(icon)}
					<Icon icon="ooui:help-ltr" height="none" width="100%" />
				{:then resolvedIcon}
					<Icon icon={resolvedIcon} height="none" width="100%" />
				{:catch}
					<Icon icon="ooui:help-ltr" height="none" width="100%" />
				{/await}
			{:else if entity_id}
				<ComputeIcon {entity_id} size="3.5rem" />
			{:else}
				<Icon icon="ooui:help-ltr" height="none" width="100%" />
			{/if}
			<!-- SVG animation ring -->
			<svg class="icon-ring" viewBox="0 0 100 100" data-state={stateOn}>
				<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" />
			</svg>
		</div>
	</div>

	<div class="bottom">
		<div class="name" data-state={stateOn}>
			{@html (sel?.template?.name && template?.name?.output) ||
				getName(sel, entity, sectionName) ||
				$lang('unknown')}
		</div>

		<div class="state" data-state={stateOn}>
			{#if marquee}
				<div class="state-inner marquee" bind:clientWidth={contentWidth}>
					{#if sel?.state || (sel?.template?.state && template?.state?.output)}
						{@html sel?.state || template?.state?.output}
					{:else if sel?.template?.set_state && template?.set_state?.output}
						{@html sel?.template?.set_state && $lang(template?.set_state?.output)}
					{:else}
						<StateLogic {entity_id} selected={sel} {contentWidth} />
					{/if}
				</div>
			{:else}
				<div class="state-inner">
					{#if sel?.state || (sel?.template?.state && template?.state?.output)}
						{@html sel?.state || template?.state?.output}
					{:else if sel?.template?.set_state && template?.set_state?.output}
						{@html sel?.template?.set_state && $lang(template?.set_state?.output)}
					{:else}
						<StateLogic {entity_id} selected={sel} {contentWidth} />
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	@keyframes card-bounce {
		0% {
			transform: scale(1) translateZ(0);
		}
		15% {
			transform: scale(0.88) translateZ(0);
		}
		35% {
			transform: scale(1.05) translateZ(0);
		}
		55% {
			transform: scale(0.95) translateZ(0);
		}
		75% {
			transform: scale(1.02) translateZ(0);
		}
		100% {
			transform: scale(1) translateZ(0);
		}
	}

	.container {
		--container-padding: 0.3rem;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
			var(--theme-button-background-color-off, rgba(24, 28, 35, 0.58));
		font-family: inherit;
		width: 100%;
		height: auto;
		aspect-ratio: 1 / 1;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: minmax(0, 1fr) auto;
		justify-items: center;
		align-items: center;
		border-radius: 0.45rem;
		margin: 0;
		padding: var(--container-padding);
		box-sizing: border-box;
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		transition:
			background 220ms ease,
			color 220ms ease,
			box-shadow 220ms ease,
			border-color 220ms ease,
			transform 220ms ease;
		transform: translateZ(0);
		overflow: hidden;
	}

	/* Applied dynamically via classList.add() */
	:global(.container.bouncing) {
		animation: card-bounce 800ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.image {
		background-size: cover;
		background-repeat: no-repeat;
	}

	.top {
		width: 100%;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 0.1rem;
	}

	.bottom {
		width: 100%;
		display: grid;
		align-content: start;
		justify-items: center;
		text-align: center;
		overflow: hidden;
		padding-top: 0.1rem;
		gap: 0.11rem;
	}

	.icon {
		--icon-size: 3.2rem;
		height: var(--icon-size);
		width: var(--icon-size);
		color: rgb(184 191 204);
		background-color: transparent;
		border: none;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background-position: center center;
		background-size: cover;
		background-repeat: no-repeat;
		box-sizing: border-box;
		transition:
			background 220ms ease,
			color 220ms ease,
			box-shadow 220ms ease,
			transform 220ms ease;
		font-size: 2rem;
		position: relative;
		overflow: visible;
	}

	.icon :global(svg) {
		height: 100% !important;
		width: 100% !important;
	}

	/* Icon animation on state change */
	@keyframes icon-pop {
		0% {
			transform: scale(0.85);
		}
		20% {
			transform: scale(1.15);
		}
		40% {
			transform: scale(0.92);
		}
		60% {
			transform: scale(1.06);
		}
		80% {
			transform: scale(0.97);
		}
		100% {
			transform: scale(1);
		}
	}

	/* Applied dynamically via classList.add() */
	:global(.icon-animating) :global(svg:not(.icon-ring)) {
		animation: icon-pop 0.7s cubic-bezier(0.22, 1, 0.36, 1);
		transform-origin: center;
	}

	/* Domain-specific icon animations */

	/* Light: bounce scale */
	@keyframes light-on {
		0% { transform: scale(0.85); }
		20% { transform: scale(1.12); }
		40% { transform: scale(0.93); }
		60% { transform: scale(1.05); }
		80% { transform: scale(0.97); }
		100% { transform: scale(1); }
	}

	/* Fan: gentle pulse (air-filter compatible) */
	@keyframes fan-pulse {
		0% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.08); opacity: 0.85; }
		100% { transform: scale(1); opacity: 1; }
	}

	/* Switch/TV: scaleY open/close */
	@keyframes tv-on {
		from { transform: scaleY(0); opacity: 0; }
		to { transform: scaleY(1); opacity: 1; }
	}
	@keyframes tv-off {
		from { transform: scaleY(1); opacity: 1; }
		to { transform: scaleY(0); opacity: 0; }
	}

	/* Media: slide up */
	@keyframes media-on {
		0% { transform: translateY(30%); opacity: 0; }
		50% { transform: translateY(-10%); }
		100% { transform: translateY(0); opacity: 1; }
	}

	/* Climate: pulse glow */
	@keyframes climate-on {
		0% { transform: scale(1); filter: brightness(1); }
		50% { transform: scale(1.08); filter: brightness(1.3); }
		100% { transform: scale(1); filter: brightness(1); }
	}

	/* Cover: rotate swing */
	@keyframes cover-on {
		0% { transform: rotateZ(0deg); }
		70% { transform: rotateZ(-18deg); }
		85% { transform: rotateZ(-12deg); }
		100% { transform: rotateZ(-15deg); }
	}
	@keyframes cover-off {
		0% { transform: rotateZ(-15deg); }
		70% { transform: rotateZ(3deg); }
		85% { transform: rotateZ(-2deg); }
		100% { transform: rotateZ(0deg); }
	}

	/* Apply animations based on domain and state */
	.icon[data-domain='light'][data-state='true'] :global(svg) {
		animation: light-on 0.7s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.icon[data-domain='fan'][data-state='true'] :global(svg) {
		animation: fan-pulse 2s ease-in-out infinite;
	}

	.icon[data-domain='switch'][data-state='true'] :global(svg),
	.icon[data-domain='media_player'][data-state='true'] :global(svg) {
		animation: tv-on 0.6s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.icon[data-domain='climate'][data-state='true'] :global(svg) {
		animation: climate-on 0.8s ease-out;
	}

	.icon[data-domain='cover'][data-state='true'] :global(svg) {
		animation: cover-on 0.7s cubic-bezier(0.16, 1, 0.3, 1);
		transform-origin: 40% 20%;
	}

	/* Off state animations */
	.icon[data-domain='switch'][data-state='false'] :global(svg),
	.icon[data-domain='media_player'][data-state='false'] :global(svg) {
		animation: tv-off 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	.icon[data-domain='cover'][data-state='false'] :global(svg) {
		animation: cover-off 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		transform-origin: 40% 20%;
	}

	/* SVG ring animation */
	@keyframes ring-pulse {
		0% {
			transform: scale(0.8);
			opacity: 0.6;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.2;
		}
		100% {
			transform: scale(1.4);
			opacity: 0;
		}
	}

	.icon-ring {
		position: absolute;
		width: 100%;
		height: 100%;
		pointer-events: none;
		transform: scale(0.8);
		opacity: 0;
	}

	.icon-ring[data-state='true'] {
		animation: ring-pulse 0.8s ease-out;
	}

	.name {
		font-weight: 500;
		color: var(--theme-button-name-color-off);
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 0.75rem;
		width: 100%;
		line-height: 1.2;
		text-align: center;
	}

	.state {
		font-weight: 400;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--theme-button-state-color-off);
		font-size: 0.7rem;
		width: 100%;
		line-height: 1.2;
		text-align: center;
		opacity: 0.9;
	}

	.name,
	.state,
	.state-inner {
		white-space: nowrap;
		transition: color 220ms ease, opacity 220ms ease;
	}

	.state-inner {
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.marquee {
		width: min-content;
	}

	.state :global(*) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.container[data-state='true'] {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05)),
			var(--theme-button-background-color-on, rgba(89, 133, 255, 0.5));
		color: white;
		border-color: rgba(255, 255, 255, 0.16);
		box-shadow:
			0 14px 30px rgba(14, 18, 28, 0.26),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.icon[data-state='true'] {
		color: white;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05)),
			var(--icon-color);
		border-color: rgba(255, 255, 255, 0.14);
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.06),
			0 0 22px color-mix(in srgb, var(--icon-color) 48%, transparent);
		transform: translateY(-1px);
	}

	.name[data-state='true'] {
		color: var(--theme-button-name-color-on);
	}

	.state[data-state='true'] {
		color: var(--theme-button-state-color-on);
		opacity: 1;
	}

	@media all and (max-width: 768px) {
		.container {
			width: calc(25vw - 0.725rem);
			flex: 0 0 calc(25vw - 0.725rem);
		}
	}
</style>
