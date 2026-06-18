<script lang="ts">
	import {
		connection,
		config,
		editMode,
		states,
		onStates,
		lang,
		dashboard,
		record,
		templates
	} from '$lib/Stores';
	import ComputeIcon from '$lib/Components/ComputeIcon.svelte';
	import Icon from '@iconify/svelte';
	import { callService } from 'home-assistant-js-websocket';
	import { marked } from 'marked';
	import { onDestroy } from 'svelte';
	import { openModal } from 'svelte-modals';
	import parser from 'js-yaml';
	import type { LovelaceItem } from '$lib/Types';

	export let sel: LovelaceItem | undefined = undefined;
	export let demo = false;

	let cardConfig: any = null;
	let parseError: string | null = null;
	let markdownUnsubscribe: (() => void) | null = null;
	let markdownOutput = '';

	// Parse YAML reactively
	$: if (sel?.yaml) {
		try {
			cardConfig = parser.load(sel.yaml);
			parseError = null;
		} catch (e: any) {
			cardConfig = null;
			parseError = e.message;
		}
	}

	// Extract entities from config
	$: entities = extractEntities(cardConfig);

	function extractEntities(cfg: any): any[] {
		if (!cfg) return [];
		const result: any[] = [];

		if (Array.isArray(cfg.entities)) {
			for (const e of cfg.entities) {
				if (typeof e === 'string') {
					const entity = $states?.[e];
					result.push({ entity_id: e, entity, name: entity?.attributes?.friendly_name || e });
				} else if (e && typeof e === 'object' && e.entity) {
					const entity = $states?.[e.entity];
					result.push({
						entity_id: e.entity,
						entity,
						name: e.name || entity?.attributes?.friendly_name || e.entity,
						icon: e.icon,
						secondary_info: e.secondary_info
					});
				}
			}
		}

		if (cfg.entity && !result.some((r) => r.entity_id === cfg.entity)) {
			const entity = $states?.[cfg.entity];
			result.unshift({
				entity_id: cfg.entity,
				entity,
				name: cfg.name || entity?.attributes?.friendly_name || cfg.entity
			});
		}

		return result;
	}

	// Handle markdown card with Jinja2 template rendering
	$: markdownContent = cardConfig?.type === 'markdown' ? cardConfig.content : '';

	$: if ($config?.state === 'RUNNING' && cardConfig?.type === 'markdown' && markdownContent) {
		renderMarkdownTemplate(markdownContent);
	}

	async function renderMarkdownTemplate(content: string) {
		if (!$connection) return;
		markdownUnsubscribe?.();

		try {
			markdownUnsubscribe = await $connection.subscribeMessage(
				(response: { result?: string } | { error?: string }) => {
					if ('result' in response && response.result !== undefined) {
						markdownOutput = marked.parse(response.result) as string;
					} else if ('error' in response) {
						markdownOutput = `<span style="color:#f44336">${response.error}</span>`;
					}
				},
				{
					type: 'render_template',
					template: content,
					report_errors: true
				}
			);
		} catch (error) {
			console.error('Markdown template error:', error);
			// Fallback: render as plain markdown
			markdownOutput = marked.parse(content) as string;
		}
	}

	// Format entity state for display
	function formatState(entity: any): string {
		if (!entity) return 'unavailable';
		const state = entity.state;
		const unit = entity.attributes?.unit_of_measurement;
		if (unit) return `${state} ${unit}`;
		return String(state);
	}

	// Check if entity domain is toggleable
	function isToggleable(entity_id: string): boolean {
		const domain = entity_id?.split('.')?.[0];
		return [
			'light',
			'switch',
			'input_boolean',
			'fan',
			'automation',
			'script',
			'media_player',
			'cover',
			'lock',
			'climate'
		].includes(domain);
	}

	// Toggle entity
	function toggleEntity(entity_id: string) {
		if (!$connection || $editMode) return;
		const domain = entity_id.split('.')[0];
		const entity = $states?.[entity_id];
		let service = 'toggle';

		if (domain === 'script' || domain === 'scene' || domain === 'button' || domain === 'input_button') {
			service = domain === 'input_button' ? 'press' : 'turn_on';
		} else if (domain === 'lock') {
			service = entity?.state === 'locked' ? 'unlock' : 'lock';
		} else if (domain === 'vacuum') {
			service = entity?.state === 'cleaning' ? 'pause' : 'start';
		}

		callService($connection, domain, service, { entity_id });
	}

	// Handle entity click
	function handleEntityClick(entity_id: string) {
		if ($editMode) return;
		// For toggleable entities, toggle; otherwise open modal
		toggleEntity(entity_id);
	}

	// Handle card-level tap action (button card)
	function handleCardTap() {
		if ($editMode) return;
		if (!cardConfig) return;

		const tapAction = cardConfig.tap_action || { action: 'toggle' };
		switch (tapAction.action) {
			case 'toggle':
				if (cardConfig.entity) toggleEntity(cardConfig.entity);
				break;
			case 'call-service':
				if (tapAction.service && $connection) {
					const [domain, service] = tapAction.service.split('.');
					callService($connection, domain, service, tapAction.data || {});
				}
				break;
			case 'navigate':
				if (tapAction.navigation_path) {
					window.location.href = tapAction.navigation_path;
				}
				break;
			case 'none':
				break;
		}
	}

	// Handle click in edit mode
	function handleEditClick() {
		if ($editMode) {
			openModal(() => import('$lib/Modal/LovelaceConfig.svelte'), { sel });
		}
	}

	onDestroy(() => {
		markdownUnsubscribe?.();
	});

	//////// Resize ////////

	let resizing = false;
	let resizeStartY = 0;
	let resizeStartHeight = 0;
	let resizeStartX = 0;
	let resizeStartSpanX = 2;

	const MIN_HEIGHT = 80;
	const MAX_HEIGHT = 1200;
	const COL_WIDTH_PX = 232;
	const GAP_PX = 6.4;

	function handleResizeStart(event: PointerEvent) {
		if (!$editMode) return;
		event.preventDefault();
		event.stopPropagation();

		resizing = true;
		resizeStartY = event.clientY;
		resizeStartX = event.clientX;
		resizeStartHeight = sel?.height ?? MIN_HEIGHT;
		resizeStartSpanX = sel?.span_x ?? 2;

		(event.target as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handleResizeMove(event: PointerEvent) {
		if (!resizing) return;

		const deltaY = event.clientY - resizeStartY;
		const newHeight = Math.round(
			Math.min(Math.max(resizeStartHeight + deltaY, MIN_HEIGHT), MAX_HEIGHT)
		);
		if (sel) sel.height = newHeight;

		const deltaX = event.clientX - resizeStartX;
		const totalCols = Math.floor(
			(document.querySelector('.items')?.clientWidth ?? 900) / (COL_WIDTH_PX + GAP_PX)
		);
		const maxSpan = Math.max(totalCols, 2);
		const deltaSpan = Math.round(deltaX / (COL_WIDTH_PX + GAP_PX));
		const newSpanX = Math.min(Math.max(resizeStartSpanX + deltaSpan, 1), maxSpan);
		if (sel) sel.span_x = newSpanX;

		$dashboard = $dashboard;
	}

	function handleResizeEnd() {
		if (!resizing) return;
		resizing = false;
		$record();
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="lovelace-card"
	class:edit-mode={$editMode}
	style:height={sel?.height ? `${sel.height}px` : 'auto'}
	on:click={handleEditClick}
	on:keydown
>
	{#if demo}
		<div class="demo">
			<Icon icon="mdi:code-braces" width="24" height="24" />
			<span>YAML Card</span>
		</div>
	{:else if parseError}
		<div class="error-state">
			<Icon icon="mdi:alert-circle-outline" width="20" height="20" />
			<span>YAML Error</span>
			<code>{parseError}</code>
		</div>
	{:else if !cardConfig}
		<div class="empty-state">
			<Icon icon="mdi:code-braces" width="24" height="24" />
			<span>{$lang('lovelace') || 'Lovelace YAML'}</span>
			<small>{$lang('configure') || 'Click to configure'}</small>
		</div>
	{:else if cardConfig.type === 'entities'}
		<!-- ENTITIES CARD -->
		<div class="card-header">{cardConfig.title || ''}</div>
		<div class="entity-rows">
			{#each entities as { entity_id, entity, name, icon: customIcon }}
				<div
					class="entity-row"
					class:active={$onStates?.includes(entity?.state?.toLowerCase())}
					on:click|stopPropagation={() => handleEntityClick(entity_id)}
					on:keydown
					role="button"
					tabindex="0"
				>
					<div class="entity-icon">
						<ComputeIcon {entity_id} size="1.4rem" />
					</div>
					<div class="entity-info">
						<span class="entity-name">{name}</span>
						{#if entity?.attributes?.unit_of_measurement}
							<span class="entity-state">{entity.state} {entity.attributes.unit_of_measurement}</span>
						{:else}
							<span class="entity-state">{entity?.state || 'unavailable'}</span>
						{/if}
					</div>
					{#if isToggleable(entity_id)}
						<div
							class="toggle-indicator"
							class:on={$onStates?.includes(entity?.state?.toLowerCase())}
						></div>
					{/if}
				</div>
			{/each}
		</div>
	{:else if cardConfig.type === 'glance'}
		<!-- GLANCE CARD -->
		<div class="card-header">{cardConfig.title || ''}</div>
		<div class="glance-grid" style:grid-template-columns="repeat({cardConfig.columns || entities.length || 3}, 1fr)">
			{#each entities as { entity_id, entity, name }}
				<div
					class="glance-item"
					class:active={$onStates?.includes(entity?.state?.toLowerCase())}
					on:click|stopPropagation={() => handleEntityClick(entity_id)}
					on:keydown
					role="button"
					tabindex="0"
				>
					<div class="glance-icon">
						<ComputeIcon {entity_id} size="1.5rem" />
					</div>
					<span class="glance-name">{name}</span>
					<span class="glance-state">{formatState(entity)}</span>
				</div>
			{/each}
		</div>
	{:else if cardConfig.type === 'markdown'}
		<!-- MARKDOWN CARD -->
		{#if cardConfig.title}
			<div class="card-header">{cardConfig.title}</div>
		{/if}
		<div class="markdown-body">
			{#if markdownOutput}
				{@html markdownOutput}
			{:else}
				{@html marked.parse(markdownContent || '') || ''}
			{/if}
		</div>
	{:else if cardConfig.type === 'button'}
		<!-- BUTTON CARD -->
		<div
			class="button-card-inner"
			class:active={$onStates?.includes($states?.[cardConfig.entity]?.state?.toLowerCase())}
			on:click|stopPropagation={handleCardTap}
			on:keydown
			role="button"
			tabindex="0"
		>
			{#if cardConfig.entity}
				<div class="button-icon">
					<ComputeIcon entity_id={cardConfig.entity} size="2.5rem" />
				</div>
			{/if}
			{#if cardConfig.name}
				<span class="button-name">{cardConfig.name}</span>
			{/if}
			{#if cardConfig.show_state && cardConfig.entity}
				<span class="button-state">{$states?.[cardConfig.entity]?.state || 'unavailable'}</span>
			{/if}
		</div>
	{:else}
		<!-- UNSUPPORTED CARD TYPE: show entity states + raw YAML -->
		<div class="card-header">
			{cardConfig.title || ''}
			<span class="card-type-badge">{cardConfig.type}</span>
		</div>

		{#if entities.length > 0}
			<div class="entity-rows">
				{#each entities as { entity_id, entity, name }}
					<div class="entity-row" on:click|stopPropagation={() => handleEntityClick(entity_id)} on:keydown role="button" tabindex="0">
						<div class="entity-icon">
							<ComputeIcon {entity_id} size="1.4rem" />
						</div>
						<div class="entity-info">
							<span class="entity-name">{name}</span>
							<span class="entity-state">{formatState(entity)}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<details class="yaml-details">
			<summary>
				<Icon icon="mdi:code-braces" width="14" height="14" />
				YAML Configuration
			</summary>
			<pre>{sel?.yaml}</pre>
		</details>
	{/if}
</div>

{#if $editMode && !demo}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="resize-handle"
		class:active={resizing}
		on:pointerdown={handleResizeStart}
		on:pointermove={handleResizeMove}
		on:pointerup={handleResizeEnd}
		on:pointercancel={handleResizeEnd}
	>
		<div class="resize-icon">⋮⋮</div>
	</div>
{/if}

<style>
	.lovelace-card {
		position: relative;
		background-color: var(--theme-colors-card-background, rgba(255, 255, 255, 0.05));
		border-radius: 0.65rem;
		padding: 0.8rem 1rem;
		min-height: 80px;
		overflow: auto;
		font-size: 0.9rem;
	}

	.lovelace-card.edit-mode {
		cursor: pointer;
	}

	/* Header */
	.card-header {
		font-weight: 600;
		font-size: 0.95rem;
		padding: 0.2rem 0 0.6rem 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: inherit;
	}

	.card-type-badge {
		font-size: 0.7rem;
		font-weight: 400;
		background: rgba(255, 192, 8, 0.2);
		color: rgba(255, 192, 8, 0.9);
		padding: 0.15em 0.5em;
		border-radius: 0.3em;
		font-family: monospace;
	}

	/* Entity Rows (entities card) */
	.entity-rows {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.entity-row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.5rem 0.3rem;
		border-radius: 0.4rem;
		cursor: pointer;
		transition: background-color 150ms ease;
	}

	.entity-row:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.entity-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: rgba(200, 200, 200, 0.8);
	}

	.entity-row.active .entity-icon {
		color: rgb(75, 166, 237);
	}

	.entity-info {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-width: 0;
		gap: 0.5rem;
	}

	.entity-name {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.entity-state {
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		flex-shrink: 0;
		font-size: 0.85rem;
	}

	.toggle-indicator {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		flex-shrink: 0;
		transition: background-color 150ms ease;
	}

	.toggle-indicator.on {
		background: rgb(75, 166, 237);
	}

	/* Glance Grid */
	.glance-grid {
		display: grid;
		gap: 0.5rem;
	}

	.glance-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.5rem 0.2rem;
		border-radius: 0.4rem;
		cursor: pointer;
		text-align: center;
		transition: background-color 150ms ease;
	}

	.glance-item:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.glance-icon {
		color: rgba(200, 200, 200, 0.8);
	}

	.glance-item.active .glance-icon {
		color: rgb(75, 166, 237);
	}

	.glance-name {
		font-size: 0.8rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.glance-state {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	/* Markdown */
	.markdown-body {
		word-wrap: break-word;
		line-height: 1.5;
	}

	.markdown-body :global(p) {
		margin: 0.4em 0;
	}

	.markdown-body :global(h1),
	.markdown-body :global(h2),
	.markdown-body :global(h3) {
		margin: 0.5em 0 0.3em 0;
	}

	.markdown-body :global(a) {
		color: rgb(36, 167, 255);
		text-decoration: none;
	}

	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		padding-left: 1.5em;
		margin: 0.4em 0;
	}

	.markdown-body :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.4em 0;
	}

	.markdown-body :global(th),
	.markdown-body :global(td) {
		border: 1px solid rgba(255, 255, 255, 0.15);
		padding: 0.3em 0.6em;
		text-align: left;
		font-size: 0.85rem;
	}

	.markdown-body :global(code) {
		background: rgba(0, 0, 0, 0.3);
		padding: 0.1em 0.3em;
		border-radius: 0.3em;
		font-size: 0.85em;
	}

	/* Button Card */
	.button-card-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.4rem;
		transition: background-color 150ms ease;
	}

	.button-card-inner:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.button-card-inner.active .button-icon {
		color: rgb(75, 166, 237);
	}

	.button-icon {
		color: rgba(200, 200, 200, 0.8);
		transition: color 150ms ease;
	}

	.button-name {
		font-weight: 500;
		font-size: 0.95rem;
		text-align: center;
	}

	.button-state {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
	}

	/* YAML Details (fallback) */
	.yaml-details {
		margin-top: 0.5rem;
	}

	.yaml-details summary {
		display: flex;
		align-items: center;
		gap: 0.4em;
		cursor: pointer;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		padding: 0.3rem 0;
	}

	.yaml-details pre {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 0.4rem;
		padding: 0.6rem 0.8rem;
		font-size: 0.75rem;
		overflow-x: auto;
		margin-top: 0.3rem;
		font-family: 'SF Mono', 'Fira Code', monospace;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.7);
	}

	/* Demo / Empty / Error states */
	.demo,
	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.4rem;
		opacity: 0.6;
	}

	.demo span {
		font-family: monospace;
		font-size: 0.9rem;
	}

	.empty-state small {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.error-state {
		color: #f44336;
	}

	.error-state code {
		font-size: 0.75rem;
		text-align: center;
		word-break: break-word;
		max-width: 100%;
	}

	/* Resize Handle */
	.resize-handle {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 2rem;
		height: 2rem;
		cursor: nwse-resize;
		z-index: 5;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0 0 0.65rem 0;
		touch-action: none;
		transition: opacity 150ms ease;
		opacity: 0.4;
	}

	.resize-handle:hover,
	.resize-handle.active {
		opacity: 1;
		background-color: rgba(255, 192, 8, 0.25);
	}

	.resize-icon {
		font-size: 0.7rem;
		letter-spacing: -2px;
		color: rgba(255, 255, 255, 0.8);
		user-select: none;
		transform: rotate(-45deg);
	}
</style>
